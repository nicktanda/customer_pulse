/**
 * Top-level orchestration for the playwright QA reviewer.
 *
 * runPlaywrightReview wires every step in `lifecycle.ts` and `navigator.ts`
 * together with strict try/finally cleanup so we never leak a worktree,
 * temp database, dev-server child, or browser. The function is best-effort:
 * any internal failure produces a `runError` field instead of throwing,
 * so the calling code can keep the review loop alive regardless.
 */
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import {
  createPrWorktree,
  prepareNodeModules,
  snapshotDatabase,
  findFreePort,
  startDevServer,
  mintAuthCookie,
  type WorktreeHandle,
  type DbSnapshot,
  type DevServerHandle,
} from "./lifecycle.js";
import {
  planNavigation,
  executeNavigation,
  verifyVisually,
  type NavigationPlan,
  type NavigationResult,
  type VisualVerdict,
} from "./navigator.js";

export interface PlaywrightReviewInput {
  branchName: string;
  idea: { title: string; description: string };
  diff: string;
}

export interface PlaywrightReviewResult {
  ran: boolean;
  /** If we couldn't even start the harness (e.g. dev server died), recorded here. */
  runError?: string;
  plan?: NavigationPlan;
  navigation?: NavigationResult;
  verdict?: VisualVerdict;
  durationMs: number;
}

/**
 * Generates a one-paragraph IA summary the planner uses to reason about
 * where a feature should live. Pulls from the parent repo (not the PR
 * worktree) so we capture the *baseline* nav structure the user knows.
 */
async function buildNavigationHint(repoRoot: string): Promise<string> {
  const candidates = [
    "apps/web/src/app/app/layout.tsx",
    "apps/web/src/components/AppSidebar.tsx",
    "apps/web/src/components/SidebarNav.tsx",
  ];
  const snippets: string[] = [];
  for (const rel of candidates) {
    try {
      const text = await readFile(join(repoRoot, rel), "utf8");
      snippets.push(`// ${rel}\n${text.slice(0, 4_000)}`);
    } catch { /* skip missing */ }
  }
  if (!snippets.length) {
    return "(no navigation hint available — assume a standard left sidebar with links named after each top-level route under /app)";
  }
  return snippets.join("\n\n---\n\n");
}

export async function runPlaywrightReview(input: PlaywrightReviewInput): Promise<PlaywrightReviewResult> {
  const t0 = Date.now();
  const cleanups: Array<() => Promise<void>> = [];
  const cleanup = async (): Promise<void> => {
    for (const fn of cleanups.reverse()) {
      try { await fn(); } catch (err) {
        console.warn(`[playwright-qa] cleanup error:`, err instanceof Error ? err.message : err);
      }
    }
  };

  try {
    // ---- 1. Snapshot DB
    const sourceDbUrl = process.env.DATABASE_URL;
    const authSecret = process.env.AUTH_SECRET;
    if (!sourceDbUrl) throw new Error("DATABASE_URL not set");
    if (!authSecret) throw new Error("AUTH_SECRET not set");
    const snap: DbSnapshot = await snapshotDatabase(sourceDbUrl);
    cleanups.push(() => snap.cleanup());

    // ---- 2. Mint auth cookie against the snapshot
    const authCookie = await mintAuthCookie(snap.url, authSecret);

    // ---- 3. Worktree + node_modules
    const worktree: WorktreeHandle = await createPrWorktree(input.branchName);
    cleanups.push(() => worktree.cleanup());
    await prepareNodeModules(worktree.path);

    // ---- 4. Dev server
    const port = await findFreePort();
    const server: DevServerHandle = await startDevServer({
      worktreePath: worktree.path,
      port,
      env: {
        DATABASE_URL: snap.url,
        NEXTAUTH_URL: `http://localhost:${port}`,
        AUTH_SECRET: authSecret,
        // Override any AUTH_COOKIE_DOMAIN that may be in the user's .env — we
        // depend on the non-Secure default cookie name for local http.
        AUTH_COOKIE_DOMAIN: "",
        NODE_ENV: "development",
      },
    });
    cleanups.push(() => server.kill());

    // ---- 5. Plan navigation
    const navigationHint = await buildNavigationHint(/* repoRoot derived below */ process.cwd().includes("/apps/worker")
      ? process.cwd().replace(/\/apps\/worker.*$/, "")
      : process.cwd());
    const plan = await planNavigation(input.idea, input.diff, navigationHint);
    if (!plan || !Array.isArray(plan.plan) || plan.plan.length === 0) {
      await cleanup();
      return {
        ran: true,
        durationMs: Date.now() - t0,
        plan: plan ?? undefined,
        runError: "navigation planner returned no plan — feature appears unreachable from the existing UI",
      };
    }

    // ---- 6. Execute + verify
    const navigation = await executeNavigation({
      baseUrl: server.baseUrl,
      authCookie,
      plan,
    });
    const verdict = await verifyVisually(input.idea, plan, navigation);

    await cleanup();
    return {
      ran: true,
      durationMs: Date.now() - t0,
      plan,
      navigation,
      verdict,
    };
  } catch (err) {
    await cleanup();
    return {
      ran: false,
      durationMs: Date.now() - t0,
      runError: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Renders the playwright result as a markdown block to inject into the QA
 * reviewer's prompt. Keeps the structure parallel to the existing
 * "Deterministic Path Findings" / "Deterministic Reachability Findings"
 * blocks so the QA reviewer can treat it as another hard-rule source.
 */
export function renderPlaywrightFindings(r: PlaywrightReviewResult): string {
  if (!r.ran && r.runError) {
    return [
      "**Playwright QA harness could not run** (treat as UNCERTAIN, not a fail):",
      `- ${r.runError}`,
    ].join("\n");
  }
  if (r.runError) {
    return [
      "**Playwright QA — feature is not reachable by clicking through the UI. This is an automatic FAIL on the Reachability criterion.**",
      "",
      `- ${r.runError}`,
    ].join("\n");
  }
  const lines: string[] = [];
  if (r.verdict?.visible === false) {
    lines.push("**Playwright QA — feature was NOT visible after navigation. This is an automatic FAIL on the Reachability criterion.**");
  } else if (r.verdict?.visible === true) {
    lines.push("**Playwright QA — feature was visible at the end of the navigation (PASS on reachability):**");
  } else {
    lines.push("**Playwright QA — no verdict available; treat reachability as UNCERTAIN.**");
  }
  lines.push("");
  if (r.plan) {
    lines.push(`- expected end state: ${r.plan.expected}`);
    lines.push(`- planned steps: ${r.plan.plan.length}`);
  }
  if (r.navigation) {
    lines.push(`- reached planned end: ${r.navigation.reachedEnd}`);
    lines.push(`- final url: ${r.navigation.finalUrl}`);
    const failed = r.navigation.steps.find((s) => !s.ok);
    if (failed) {
      lines.push(`- failed step: "${failed.step.description}" — ${failed.error ?? "unknown"}`);
    }
    if (r.navigation.consoleErrors.length) {
      lines.push(`- console errors: ${r.navigation.consoleErrors.length} (first: ${r.navigation.consoleErrors[0]})`);
    }
  }
  if (r.verdict) {
    lines.push("");
    lines.push(`- explanation: ${r.verdict.explanation}`);
    for (const f of r.verdict.findings ?? []) lines.push(`  - ${f}`);
  }
  lines.push("");
  lines.push(`_Playwright run took ${(r.durationMs / 1000).toFixed(1)}s._`);
  return lines.join("\n");
}
