/**
 * Iterative PR review loop — after a PR is created, three AI reviewers
 * (code + PM + QA) evaluate it alongside CI status. If any reviewer
 * dissents OR CI is red, a fixer generates a follow-up commit addressing
 * the union of their feedback and the loop runs again. The loop keeps
 * going until everything is green; there is no hard cap on rounds.
 */
import { eq } from "drizzle-orm";
import type { Database } from "@customer-pulse/db/client";
import {
  ideas,
  ideaPullRequests,
  ideaInsights,
  insights,
  integrations,
  projectSettings,
} from "@customer-pulse/db/client";
import { decryptCredentialsColumn } from "@customer-pulse/db/lockbox";
import { callClaude, callClaudeJson } from "../ai/call-claude.js";
import { commitFile } from "./pr-creator.js";
import { analyzeRepo, findPathMismatches, findUnreachableComponents, findMisplacedNewPages, type RepoContext } from "./repo-analyzer.js";
import { runPlaywrightReview, renderPlaywrightFindings } from "./playwright/runner.js";
import { regenerateLockfile } from "./lockfile-regen.js";
import { applyMechanicalCiFixes } from "./mechanical-ci-fixers.js";

interface GithubCreds {
  access_token: string;
  owner: string;
  repo: string;
  default_branch?: string;
}

interface ReviewResult {
  verdict: "approved" | "needs_changes";
  text: string;
}

interface FixFile {
  path: string;
  /** Required for "create" and "modify"; omit/empty for "delete". */
  content?: string;
  action: "create" | "modify" | "delete";
}

interface FixResult {
  files: FixFile[];
  commit_message: string;
  summary: string;
}

interface CiFailure {
  name: string;
  summary: string;
}

interface CiStatus {
  failures: CiFailure[];
  pending: boolean;
  hasAnyChecks: boolean;
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const CODE_REVIEW_SYSTEM = `You are a senior code reviewer. Review a GitHub pull request diff alongside any CI failures from the same commit.

You will receive:
- The PR diff
- A list of CI failures (each with the check name and any output the CI provided), if CI ran and any checks failed

Your verdict must account for both the code AND the CI signal. If CI failed, that is by itself sufficient reason for "needs_changes" — describe what's failing and, where the diff makes it inferable, what's likely causing it (e.g. "type_check failed: \`AccentColorPicker\` is missing the \`onChange\` prop on line 42 of …").

Check for:
1. **Correctness** — logic errors, off-by-one, missing error handling
2. **Security** — injection, XSS, secrets in code, unsafe input handling
3. **Quality** — naming, readability, unnecessary complexity
4. **Completeness** — missing imports, edge cases, broken tests
5. **CI signals** — if any CI check failed, treat as a hard blocker; tie the failure back to specific lines in the diff if possible

Return a JSON object with exactly two fields:
- "verdict": "approved" if the code is acceptable AND CI is green (or wasn't run); "needs_changes" if there are code issues OR CI failures
- "review": your review as a markdown string. Start with a one-line verdict (✅ Looks good / ⚠️ Needs attention / ❌ Needs changes). Then organise findings into sections: **Code** (correctness/security/quality/completeness) and **CI** (each failing check, what it means, likely fix location). Omit a section if it has no findings.

Only use "needs_changes" for real problems — style nits or minor suggestions should still be "approved" with the notes included. CI failures always count as real problems.

Respond with ONLY the JSON object.`;

const PM_REVIEW_SYSTEM = `You are a product manager reviewing a pull request auto-generated to address a customer insight.

You will receive the original insight, the proposed idea, and the PR diff.

Evaluate whether the changes actually solve the customer problem. Consider:
1. **Relevance** — do the code changes address the core issue?
2. **Completeness** — does this fully solve the problem or only partially?
3. **User impact** — will customers notice an improvement?
4. **Reachability** — can users actually reach the new feature? Code that exists in the repo but isn't wired into any page, layout, or route is invisible to customers and does NOT deliver user impact. Specifically check:
   - For new React components, the diff must also include a Next.js \`page.tsx\` / \`layout.tsx\` / \`route.ts\` (under \`apps/web/src/app/...\`) that imports them, OR a modification to an existing page/layout/component that imports them.
   - For new providers (e.g. Context providers), the diff must also wrap them around the app via a \`layout.tsx\` modification.
   - For new server-side functions, the diff must also include a UI handler (form, button, etc.) or schedule that triggers them.
   - **Where the page lives matters as much as whether it exists.** If the codebase's logged-in product lives under a nested route prefix (e.g. \`apps/web/src/app/app/...\` rather than \`apps/web/src/app/...\`), a new top-level page at \`apps/web/src/app/<seg>/page.tsx\` is invisible to users browsing the actual product. URL-reachable ≠ reachable-by-a-real-user. New user-facing pages must live under the SAME prefix as existing user-facing pages in the repo. Compare the new \`page.tsx\` path against the most common existing \`page.tsx\` paths — if it doesn't share a prefix, that's a genuine gap.
   If new components/providers exist but nothing in the diff renders or imports them, OR if they're wired to a top-level route outside the authenticated/product tree, that is a hard "needs_changes" — the user impact is zero until reachability is wired up correctly. Do not approve PRs that ship orphaned code or code at the wrong route prefix claiming to address a customer-facing idea.

Return a JSON object with exactly two fields:
- "verdict": "approved" if the PR addresses the insight, or "needs_changes" if it misses the core problem
- "review": your review as a markdown string. Start with a one-line verdict (✅ Addresses the insight / ⚠️ Partially addresses / ❌ Does not address), then 2-4 bullet points explaining your reasoning.

Only use "needs_changes" for genuine gaps — minor scope limitations should still be "approved" with notes. Orphaned/unreachable code IS a genuine gap.

Respond with ONLY the JSON object.`;

const QA_REVIEW_SYSTEM = `You are a QA engineer verifying that a pull request (a) does what it claims AND (b) fits cleanly into the project's existing structure AND (c) is actually reachable to users.

You will receive the original idea/insight, the diff, a repo context summary (top-level directories, sample file paths, tech stack), a "Deterministic Path Findings" block, a "Deterministic Reachability Findings" block, a "Deterministic Route-Prefix Findings" block, and a "Playwright QA Findings" block — all pre-computed against the actual repo, PR diff, and a live dev server running the PR's code. Your job is to derive acceptance criteria from the idea AND apply standard infrastructure + reachability criteria, then check each against the diff and the playwright findings.

Process:
1. Derive 3-5 **Functional** acceptance criteria from the idea + insights. Each is a single-line, testable statement (e.g. "Adds a 'Resend' button to the pulse report detail page").
2. Add the following **Infrastructure** criteria, adapted to the repo:
   - "New/modified file paths follow the project's existing layout (e.g. matches the \`src/\` prefix used by other files in the same package, or whichever convention the sample paths show)."
   - "New imports reference modules that exist in the repo (or are added in the diff)."
   - "No duplicate top-level directories created at a level that conflicts with the existing layout (e.g. don't add \`apps/web/app/\` if \`apps/web/src/app/\` already exists)."
3. Add the following **Reachability** criteria:
   - "Every newly-created React component, hook, or provider is imported (and rendered) by at least one other file in the diff — typically a Next.js \`page.tsx\` / \`layout.tsx\` under the repo's authenticated app route tree, or an existing page modified to consume the new code."
   - "If the idea is a user-facing feature for logged-in users, the diff includes a route inside the repo's authenticated app tree — not a brand-new top-level route alongside existing top-level routes. Check the repo context's sample file paths: whichever first segment under \`apps/web/src/app/\` is used by existing pages (e.g. \`apps/web/src/app/app/...\` or \`apps/web/src/app/(authenticated)/...\`) is where new user-facing pages must live. A new \`apps/web/src/app/<seg>/page.tsx\` at the top level is invisible to logged-in users navigating the app."
   - "Either a new \`page.tsx\` under the authenticated app tree exists, OR an existing page/sidebar/menu/settings nav is modified to surface the feature."
4. For every criterion (functional + infrastructure + reachability), check the diff and assign:
   - "PASS" — clearly met; cite file path + key line/snippet as evidence.
   - "FAIL" — not met or implementation is broken.
   - "UNCERTAIN" — diff doesn't show enough to verify.
5. Be strict on infrastructure: if any new file path conflicts with the conventions visible in the sample paths, that's a **FAIL** even when the feature itself is implemented.
6. Be strict on reachability: a PR that ships components without wiring them into any page or layout is a **FAIL** regardless of how complete the components themselves are. The feature does not exist for users until it's reachable.
7. **HARD RULE — paths**: if the "Deterministic Path Findings" block lists any items, they have already been verified by code against the actual repo tree. Each listed item is an automatic FAIL on the path-layout criterion — copy the finding into your Infrastructure section as a \`[❌]\`, do NOT explain them away as "fits Next.js conventions" or similar, and the overall verdict MUST be "needs_changes".
8. **HARD RULE — reachability**: if the "Deterministic Reachability Findings" block lists any items, they have already been verified by code by scanning the diff for imports of each new component. Each listed item is an automatic FAIL on the reachability criterion — copy the finding into your Reachability section as a \`[❌]\`, do NOT explain them away as "the file structure makes it discoverable" or similar, and the verdict MUST be "needs_changes".
9. **HARD RULE — playwright**: the "Playwright QA Findings" block reports the result of an automated browser session that clicked through the live UI to try to reach the feature. If it reports the feature is NOT visible or NOT reachable, that is an automatic FAIL on the Reachability section — record the finding as \`[❌]\` and the verdict MUST be "needs_changes". Code-exists-but-user-can't-see-it is the exact failure mode this check is designed to catch; do not rationalise it away. If the playwright harness could not run at all (runError without a verdict), treat reachability as UNCERTAIN and surface that — do not assume PASS.
10. **HARD RULE — route prefix**: if the "Deterministic Route-Prefix Findings" block lists any items, they have already been verified by code by cross-referencing the diff's new \`page.tsx\` paths against where existing pages actually live in the repo. Each listed item is an automatic FAIL on the Reachability section — the page is technically URL-reachable but is outside the authenticated tree where real users navigate. Copy the finding into Reachability as \`[❌]\` and the verdict MUST be "needs_changes". Do not approve a "/settings" page when the rest of the app lives at "/app/settings" — that is the exact failure mode this check is designed to catch.

Return a JSON object with exactly two fields:
- "verdict": "approved" only if EVERY criterion (functional + infrastructure + reachability) is PASS. If any are FAIL or UNCERTAIN, "needs_changes".
- "review": markdown. Start with a one-line verdict (✅ Verified / ⚠️ Some criteria unverified / ❌ Failed criteria). Then three sections, **Functional**, **Infrastructure**, and **Reachability**, each as a checklist:
  \`\`\`
  - [✅] <criterion> — <evidence: file path, snippet>
  - [❌] <criterion> — <what's missing/broken>
  - [❓] <criterion> — <why it can't be verified>
  \`\`\`

Only "approved" when every box is ✅. Respond with ONLY the JSON object.`;

const FIX_SYSTEM = `You are a senior software engineer. You will receive:
1. The current PR diff
2. Code review feedback
3. PM review feedback
4. QA review feedback (acceptance-criteria checklist)
5. CI failures (failing checks from GitHub Actions / CircleCI / etc.) — empty if CI is green or hasn't run yet

Generate code changes that address ALL feedback from every reviewer AND fix any CI failures. For each file, provide:
- "path": file path relative to repo root
- "content": the COMPLETE updated file content (not a diff). Required for "create" and "modify"; omit (or empty string) for "delete".
- "action": one of:
  - "create" — new file
  - "modify" — replace an existing file's contents
  - "delete" — remove an existing file from the repo

When fixing a wrong-path file, emit BOTH a "create" at the corrected path AND a "delete" at the old path. Do not just create the new copy and leave the original — that produces duplicates that will fail the next round of review. The same applies to renames or any reorganisation.

When fixing a reachability/orphaned-component finding (e.g. "AccentColorPicker.tsx is never imported"), the fix is NOT to delete the component. Instead, "create" the missing wiring:
- For a Next.js feature, add a \`page.tsx\` UNDER THE SAME ROUTE PREFIX AS THE REPO'S EXISTING USER-FACING PAGES. Inspect the diff, the file paths under "Repo Context", and (when present) the "Deterministic Route-Prefix Findings" block — whichever first segment under \`apps/web/src/app/\` is used by the majority of existing pages is the authenticated/product tree. If existing pages live under \`apps/web/src/app/app/...\`, your new page MUST live there too (e.g. \`apps/web/src/app/app/<segment>/page.tsx\`). Do NOT create a brand-new top-level route at \`apps/web/src/app/<segment>/page.tsx\` for a user-facing feature — those land outside the authenticated tree and are invisible to logged-in users.
- For a context provider, "modify" the most-deeply-nested existing layout that still wraps the user-facing routes (typically the authenticated tree's layout, e.g. \`apps/web/src/app/app/layout.tsx\`). Only modify the root \`apps/web/src/app/layout.tsx\` when the provider truly needs to wrap unauthenticated pages too.
- For an existing settings/dashboard area, "modify" the relevant existing page to consume the component — for example, modify the existing \`apps/web/src/app/app/settings/page.tsx\` rather than creating a new \`apps/web/src/app/settings/page.tsx\`.
The goal is that, after the fix commit, at least one Next.js auto-discovered file (\`page.tsx\`/\`layout.tsx\`/\`route.ts\`) imports the orphaned component AND it lives at a route prefix the actual product uses.

### Test / Vitest configuration fixes

CI runs Vitest with NO globals (\`globals: false\` is the default). \`describe\`, \`it\`, \`expect\`, \`beforeEach\` etc. are **not** injected — every test file in this repo must explicitly import them, e.g. \`import { describe, it, expect } from "vitest";\`. The same applies to \`vi\` (\`import { vi } from "vitest";\`).

When CI reports \`ReferenceError: describe is not defined\` (or similar for \`it\`/\`expect\`/\`vi\`):
- The fix is to ADD the missing \`import { ... } from "vitest";\` line to the failing test file. Do NOT add a \`// @vitest-environment <env>\` docblock — that changes the test environment, which is a different problem and almost never the real cause.
- Adding \`@vitest-environment jsdom\` (or any non-default env) requires the env package to be installed as a devDependency. If you cannot confirm it's already in the workspace's \`package.json\`, do not add the docblock — add the explicit imports instead.

When a test legitimately needs DOM globals (\`document\`, \`window\`):
- Check the workspace's \`package.json\` for \`jsdom\` or \`happy-dom\` in \`devDependencies\` before adding the docblock.
- If neither is installed, prefer refactoring the test to not require DOM (e.g. extract the DOM-touching code into a pure function) over adding an environment + dependency.

### Dependency changes

If a fix genuinely requires adding/removing/upgrading an npm package, emit ONLY a \`modify\` on the relevant \`package.json\` (root or workspace, e.g. \`apps/web/package.json\`). Do NOT emit changes to \`yarn.lock\` — the model cannot produce a valid lockfile by hand, and CI runs with \`--frozen-lockfile\` which will reject any package.json change whose dependency tree isn't reflected in the lockfile. The harness will automatically run \`yarn install\` after your commit lands and push the regenerated \`yarn.lock\` in a follow-up commit. Trust this; do not try to handcraft a lockfile.

### NO FEATURE FLAGS (hard requirement)

- DO NOT introduce a \`process.env.NEXT_PUBLIC_*\` or \`process.env.FEATURE_*\` env-var gate around the new feature.
- DO NOT introduce a constant like \`ACCENT_COLOUR_ENABLED\`, \`FEATURE_ENABLED\`, \`isXEnabled\`, etc. that defaults to \`false\` and short-circuits rendering with \`return null\` / \`if (!enabled) return ...\`.
- DO NOT add conditional JSX wrappers like \`{process.env.NEXT_PUBLIC_X === "true" ? <Component /> : null}\` around the user-facing surface.
- If a previous round of this loop ADDED such a gate, your fix MUST REMOVE it. Strip the env check, strip the constant, and render the feature unconditionally. The accent-colour insight has now shipped four times in a row behind a default-off flag — the user clicks Generate-PR, the PR merges, and nothing is visible in the product. That is the failure mode this rule is designed to eliminate. STOP doing it.
- The ONLY case where an env-var gate is acceptable is when the original idea EXPLICITLY asks for one (e.g. "add a kill switch for X"). In every other case, ship the feature unconditionally — risk-gating is the human reviewer's call, not yours.

Return a JSON object with:
- "files": array of file changes
- "commit_message": concise commit message describing the fixes
- "summary": 1-2 sentence summary

Only change what's needed to address the feedback. Don't refactor unrelated code.
Respond with ONLY the JSON object.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getGithubCreds(
  db: Database,
  integrationId: number,
): Promise<{ creds: GithubCreds; headers: Record<string, string> } | null> {
  const masterKey = process.env.LOCKBOX_MASTER_KEY?.trim();
  if (!masterKey) return null;

  const [integration] = await db.select().from(integrations).where(eq(integrations.id, integrationId)).limit(1);
  if (!integration?.credentialsCiphertext) return null;

  try {
    const decrypted = decryptCredentialsColumn(integration.credentialsCiphertext, masterKey);
    const creds = JSON.parse(decrypted) as GithubCreds;
    const headers = {
      Authorization: `token ${creds.access_token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    };
    return { creds, headers };
  } catch {
    return null;
  }
}

async function postPrComment(
  headers: Record<string, string>,
  owner: string,
  repo: string,
  prNumber: number,
  body: string,
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
      { method: "POST", headers, body: JSON.stringify({ body }) },
    );
    return res.ok;
  } catch {
    return false;
  }
}

async function getCiStatus(
  headers: Record<string, string>,
  owner: string,
  repo: string,
  headSha: string,
): Promise<CiStatus> {
  try {
    const apiBase = `https://api.github.com/repos/${owner}/${repo}`;
    const [checkRunsRes, statusRes] = await Promise.all([
      fetch(`${apiBase}/commits/${headSha}/check-runs`, { headers }),
      fetch(`${apiBase}/commits/${headSha}/status`, { headers }),
    ]);
    const checkRuns = checkRunsRes.ok
      ? ((await checkRunsRes.json()) as { check_runs?: { name: string; status: string; conclusion: string | null; output?: { summary?: string; text?: string } }[] }).check_runs ?? []
      : [];
    const status = statusRes.ok
      ? (await statusRes.json()) as { state: "success" | "failure" | "error" | "pending"; statuses?: { context: string; state: string; description?: string }[]; total_count?: number }
      : null;

    const failures: CiFailure[] = [];
    let pending = false;
    for (const c of checkRuns) {
      if (c.status !== "completed") {
        pending = true;
      } else if (c.conclusion && !["success", "skipped", "neutral"].includes(c.conclusion)) {
        let summary = [c.output?.summary, c.output?.text].filter(Boolean).join("\n").slice(0, 2000);
        // GitHub Actions doesn't populate `output.summary`/`output.text` by
        // default, so most check-runs come back with empty diagnostics.
        // When that happens, fall back to the workflow run's job logs —
        // tail the last few KB so the fixer has the actual error text.
        if (!summary) {
          const tail = await fetchJobLogTail(headers, owner, repo, headSha, c.name);
          summary = tail ?? `(no detail; conclusion=${c.conclusion})`;
        }
        failures.push({ name: c.name, summary });
      }
    }
    const statusTotal = status?.total_count ?? 0;
    if (statusTotal > 0) {
      if (status!.state === "pending") {
        pending = true;
      } else if (status!.state === "failure" || status!.state === "error") {
        for (const s of status!.statuses ?? []) {
          if (s.state === "failure" || s.state === "error") {
            failures.push({ name: s.context, summary: s.description ?? `(no description; state=${s.state})` });
          }
        }
      }
    }
    return { failures, pending, hasAnyChecks: checkRuns.length > 0 || statusTotal > 0 };
  } catch {
    return { failures: [], pending: false, hasAnyChecks: false };
  }
}

/**
 * Fetches a failing GitHub Actions job's logs for a given commit + check
 * name, then extracts the error-relevant context. Falls back to null on
 * any non-2xx or missing run/job.
 *
 * Why this is not a plain `.slice(-N)`: GitHub Actions appends runtime
 * notices (Node-version deprecation warnings etc.) after the failing step
 * finishes, so the last few KB of a log are often unrelated chatter while
 * the real Vitest/tsc error sits earlier in the file. We scan for error
 * markers and pull ±40 lines around each, so the fixer sees the actual
 * assertion or stack trace, not the trailing warning.
 */
async function fetchJobLogTail(
  headers: Record<string, string>,
  owner: string,
  repo: string,
  sha: string,
  checkName: string,
): Promise<string | null> {
  try {
    const runsRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/runs?head_sha=${sha}&per_page=10`,
      { headers },
    );
    if (!runsRes.ok) return null;
    const { workflow_runs: runs = [] } = (await runsRes.json()) as {
      workflow_runs?: { id: number; conclusion: string | null }[];
    };

    for (const run of runs) {
      if (run.conclusion !== "failure") continue;
      const jobsRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/actions/runs/${run.id}/jobs?per_page=50`,
        { headers },
      );
      if (!jobsRes.ok) continue;
      const { jobs = [] } = (await jobsRes.json()) as {
        jobs?: { id: number; name: string; conclusion: string | null }[];
      };
      const job = jobs.find((j) => j.name === checkName && j.conclusion === "failure");
      if (!job) continue;

      const logRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/actions/jobs/${job.id}/logs`,
        { headers },
      );
      if (!logRes.ok) continue;
      const text = await logRes.text();
      return extractErrorContext(text);
    }
    return null;
  } catch {
    return null;
  }
}

const CI_ERROR_MARKERS: RegExp[] = [
  /##\[error\]/i,
  /\bFAIL\s/, // Vitest "FAIL src/..." line (often preceded by ANSI codes)
  /\bAssertionError\b/,
  /\berror TS\d+/, // tsc diagnostics
  /\bSyntaxError\b/,
  /\bTypeError\b/,
  /\berror Command failed/i,
  /^\s*at\s+\S+\s+\(/m, // stack frame
  /\bexpected\b.+\bto\b/i,
];

/**
 * Extracts error-relevant slices from a CI log. If markers are found,
 * returns ±40 lines around each match (overlapping ranges merged).
 * Otherwise falls back to the last `capBytes` of raw text.
 */
export function extractErrorContext(text: string, capBytes = 12_000): string {
  const lines = text.split("\n");
  const matchIdx: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (CI_ERROR_MARKERS.some((re) => re.test(line))) matchIdx.push(i);
  }
  if (matchIdx.length === 0) {
    return text.length > capBytes ? text.slice(-capBytes) : text;
  }
  const ranges: Array<[number, number]> = [];
  for (const i of matchIdx) {
    const start = Math.max(0, i - 40);
    const end = Math.min(lines.length - 1, i + 40);
    const last = ranges[ranges.length - 1];
    if (last && start <= last[1] + 1) {
      last[1] = Math.max(last[1], end);
    } else {
      ranges.push([start, end]);
    }
  }
  const joined = ranges
    .map(([s, e]) => lines.slice(s, e + 1).join("\n"))
    .join("\n... [snip] ...\n");
  return joined.length > capBytes ? joined.slice(-capBytes) : joined;
}

async function getPrHead(
  headers: Record<string, string>,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, { headers });
    if (!res.ok) return null;
    const json = (await res.json()) as { head?: { sha?: string } };
    return json.head?.sha ?? null;
  } catch {
    return null;
  }
}

// Truncation cap for diffs that feed into AI prompts. Has to balance two
// failure modes: too big and we blow the model's context; too small and
// we cut off the very files that contain the wiring (which silently
// breaks deterministic reachability/path checks when they run on the
// truncated diff). Deterministic checks use the full diff regardless.
const AI_DIFF_CAP_BYTES = 30_000;

export function truncateDiffForAi(diff: string, cap = AI_DIFF_CAP_BYTES): string {
  return diff.length > cap ? diff.slice(0, cap) + "\n\n... (diff truncated)" : diff;
}

/**
 * Fetches the full unified diff for a PR. Returns null on any non-2xx or
 * network error. Callers that pass the diff into an AI prompt should run
 * `truncateDiffForAi` first; deterministic scanners must use the full
 * value or they may miss late-in-the-diff wiring.
 */
async function getPrDiff(
  headers: Record<string, string>,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      { headers: { ...headers, Accept: "application/vnd.github.v3.diff" } },
    );
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function shouldAutoMerge(db: Database, projectId: number): Promise<boolean> {
  const [settings] = await db
    .select({ autoMerge: projectSettings.githubAutoMerge })
    .from(projectSettings)
    .where(eq(projectSettings.projectId, projectId))
    .limit(1);
  return Boolean(settings?.autoMerge);
}

async function enqueueAutoMerge(pullRequestId: number): Promise<void> {
  const { Queue } = await import("bullmq");
  const { getRedisConnection } = await import("../redis.js");
  const { QUEUE_DEFAULT } = await import("../queue-names.js");
  const q = new Queue(QUEUE_DEFAULT, { connection: getRedisConnection() });
  await q.add(
    "GithubAutoMergeJob",
    { pullRequestId },
    { delay: 15_000, removeOnComplete: 100, removeOnFail: 500 },
  );
}

// ---------------------------------------------------------------------------
// Human handoff
// ---------------------------------------------------------------------------

/**
 * After both AI reviewers approve, tag the repo owner for a final human review.
 * Requests a review via the GitHub API and posts a summary comment.
 */
async function requestHumanReview(
  headers: Record<string, string>,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<void> {
  // Request a review from the repo owner via the GitHub API
  try {
    await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/requested_reviewers`,
      { method: "POST", headers, body: JSON.stringify({ reviewers: [owner] }) },
    );
  } catch {
    // Not fatal — the comment below serves as a fallback notification
  }

  await postPrComment(
    headers, owner, repo, prNumber,
    `## ✅ Ready for human review\n\nBoth the code reviewer and PM reviewer have approved this PR. @${owner} — please review and merge when you're satisfied.\n\n---\n_Automated review by xenoform.ai_`,
  );
}

// ---------------------------------------------------------------------------
// Core review + fix loop
// ---------------------------------------------------------------------------

async function runCodeReview(
  diff: string,
  ideaTitle: string,
  ciFailures: CiFailure[],
): Promise<ReviewResult> {
  const ciSection = ciFailures.length > 0
    ? ciFailures.map((f) => `### ❌ ${f.name}\n\n${f.summary}`).join("\n\n")
    : "_(CI green or hasn't run yet — no CI failures to consider)_";
  const result = await callClaudeJson<{ verdict: string; review: string }>({
    system: CODE_REVIEW_SYSTEM,
    user: [
      `## Pull Request: ${ideaTitle}`,
      "",
      "### Diff",
      "```diff",
      diff,
      "```",
      "",
      "### CI Failures",
      ciSection,
    ].join("\n"),
    maxTokens: 2048,
  });
  if (!result) return { verdict: "approved", text: "_Code review could not be generated._" };
  return {
    verdict: result.verdict === "needs_changes" ? "needs_changes" : "approved",
    text: result.review ?? "",
  };
}

async function runPmReview(
  diff: string,
  idea: { title: string; description: string; rationale: string | null },
  linkedInsights: { title: string; description: string }[],
  filesChanged: string,
): Promise<ReviewResult> {
  const result = await callClaudeJson<{ verdict: string; review: string }>({
    system: PM_REVIEW_SYSTEM,
    user: [
      `## Original Insight(s)`,
      ...linkedInsights.map((i) => `- **${i.title}**: ${i.description}`),
      linkedInsights.length === 0 ? "_(no linked insights)_" : "",
      "",
      `## Idea`,
      `**${idea.title}**`,
      idea.description,
      idea.rationale ? `\n**Rationale:** ${idea.rationale}` : "",
      "",
      `## PR Changes`,
      filesChanged,
      "",
      `## Diff`,
      "```diff",
      diff,
      "```",
    ].join("\n"),
    maxTokens: 2048,
  });
  if (!result) return { verdict: "approved", text: "_PM review could not be generated._" };
  return {
    verdict: result.verdict === "needs_changes" ? "needs_changes" : "approved",
    text: result.review ?? "",
  };
}

function summarizeRepoContext(ctx: RepoContext): string {
  const tech = Object.entries(ctx.techStack)
    .filter(([k, v]) => k !== "extensions" && v === true)
    .map(([k]) => k);
  const structure = ctx.structure as { topDirs?: string[]; sampleFiles?: string[] };
  const conventions = ctx.conventions as Record<string, unknown>;
  return [
    `Tech: ${tech.join(", ") || "unknown"}`,
    `Top-level dirs: ${(structure.topDirs ?? []).join(", ")}`,
    `Conventions: ${Object.entries(conventions).map(([k, v]) => `${k}=${v}`).join(", ") || "n/a"}`,
    `Sample paths (showing existing layout):`,
    ...(structure.sampleFiles ?? []).slice(0, 25).map((p) => `  - ${p}`),
  ].join("\n");
}


async function runQaReview(
  diff: string,
  idea: { title: string; description: string; rationale: string | null },
  linkedInsights: { title: string; description: string }[],
  filesChanged: string,
  repoContext: RepoContext | null,
  pathMismatches: string[],
  unreachableComponents: string[],
  misplacedPages: string[],
  playwrightFindings: string,
): Promise<ReviewResult> {
  const mismatchSection = pathMismatches.length > 0
    ? [
        "**The following deterministic path-mismatch findings have already been verified against the repo's actual directory tree and MUST be treated as hard FAILs in the Infrastructure section. They cannot be rationalised away — if they're listed, the verdict is `needs_changes`.**",
        "",
        ...pathMismatches.map((m) => `- ${m}`),
      ].join("\n")
    : "_(no path mismatches detected)_";
  const reachabilitySection = unreachableComponents.length > 0
    ? [
        "**The following components are created by this PR but never imported, rendered, or referenced by any other file in the diff. The diff has been scanned by code; these findings are NOT subjective. Treat each as a hard FAIL in the Reachability section — the verdict MUST be `needs_changes`.**",
        "",
        ...unreachableComponents.map((m) => `- ${m}`),
      ].join("\n")
    : "_(no unreachable components detected)_";
  const misplacedSection = misplacedPages.length > 0
    ? [
        "**The following new pages are created at top-level routes that are OUTSIDE this repo's established user-facing route tree. The check has cross-referenced the new file paths against where existing `page.tsx` files actually live in the repo — these findings are NOT subjective. Each one is a hard FAIL in the Reachability section: the page is technically URL-reachable but invisible to real users browsing the app's navigation. The verdict MUST be `needs_changes`.**",
        "",
        ...misplacedPages.map((m) => `- ${m}`),
      ].join("\n")
    : "_(no misplaced new pages detected)_";
  const result = await callClaudeJson<{ verdict: string; review: string }>({
    system: QA_REVIEW_SYSTEM,
    user: [
      `## Original Insight(s)`,
      ...linkedInsights.map((i) => `- **${i.title}**: ${i.description}`),
      linkedInsights.length === 0 ? "_(no linked insights)_" : "",
      "",
      `## Idea`,
      `**${idea.title}**`,
      idea.description,
      idea.rationale ? `\n**Rationale:** ${idea.rationale}` : "",
      "",
      `## Repo Context`,
      repoContext ? summarizeRepoContext(repoContext) : "_(repo context unavailable — be conservative on infrastructure criteria)_",
      "",
      `## Deterministic Path Findings`,
      mismatchSection,
      "",
      `## Deterministic Reachability Findings`,
      reachabilitySection,
      "",
      `## Deterministic Route-Prefix Findings`,
      misplacedSection,
      "",
      `## Playwright QA Findings`,
      playwrightFindings,
      "",
      `## Files Changed`,
      filesChanged,
      "",
      `## Diff`,
      "```diff",
      diff,
      "```",
    ].join("\n"),
    maxTokens: 2048,
  });
  if (!result) return { verdict: "approved", text: "_QA review could not be generated._" };
  return {
    verdict: result.verdict === "needs_changes" ? "needs_changes" : "approved",
    text: result.review ?? "",
  };
}

async function generateFixes(
  diff: string,
  codeReview: ReviewResult,
  pmReview: ReviewResult,
  qaReview: ReviewResult,
  ciFailures: CiFailure[],
): Promise<FixResult | null> {
  const ciSection = ciFailures.length > 0
    ? ciFailures.map((f) => `### ❌ ${f.name}\n\n${f.summary}`).join("\n\n")
    : "_(CI green or hasn't run yet — no CI failures to address)_";
  return callClaudeJson<FixResult>({
    system: FIX_SYSTEM,
    user: [
      "## Current PR Diff",
      "```diff",
      diff,
      "```",
      "",
      "## Code Review Feedback",
      codeReview.text,
      "",
      "## PM Review Feedback",
      pmReview.text,
      "",
      "## QA Review Feedback",
      qaReview.text,
      "",
      "## CI Failures",
      ciSection,
    ].join("\n"),
    maxTokens: 64000,
  });
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Iterative review loop: review → fix → re-review until both approve or cap is hit.
 * Posts each round's reviews as PR comments. Non-fatal — errors are logged.
 */
export async function reviewPullRequest(
  db: Database,
  pullRequestId: number,
): Promise<void> {
  const [pr] = await db.select().from(ideaPullRequests).where(eq(ideaPullRequests.id, pullRequestId)).limit(1);
  if (!pr || pr.status !== 1 || !pr.prNumber || !pr.branchName) return;

  const gh = await getGithubCreds(db, pr.integrationId);
  if (!gh) {
    console.warn("[pr-review] Could not load GitHub credentials — skipping reviews");
    return;
  }
  const { creds, headers } = gh;

  const [idea] = await db.select().from(ideas).where(eq(ideas.id, pr.ideaId)).limit(1);
  if (!idea) return;

  const linkedInsights = await db
    .select({ title: insights.title, description: insights.description })
    .from(ideaInsights)
    .innerJoin(insights, eq(insights.id, ideaInsights.insightId))
    .where(eq(ideaInsights.ideaId, idea.id))
    .limit(3);

  const filesChangedStr = Array.isArray(pr.filesChanged)
    ? (pr.filesChanged as { path: string; action: string }[]).map((f) => `- \`${f.path}\` (${f.action})`).join("\n")
    : "";

  // Cached on commit SHA — already populated by createPullRequest's analyze step,
  // so this is normally a single DB read. Used by QA to verify infrastructure
  // sanity (paths follow project layout, no duplicate top-level dirs, etc.).
  let repoContext: RepoContext | null = null;
  try {
    repoContext = await analyzeRepo(db, pr.integrationId, creds);
  } catch (err) {
    console.warn(`[pr-review] PR #${pr.prNumber} — repo analysis unavailable:`, err instanceof Error ? err.message : err);
  }

  // Deterministic check against the actual repo tree — catches the
  // wrong-directory bug (e.g. files at `apps/web/components/...` when the
  // repo uses `apps/web/src/components/...`) without relying on the QA
  // model to do literal path comparison correctly.
  const filesChangedArr = Array.isArray(pr.filesChanged)
    ? (pr.filesChanged as { path: string; action: string }[])
    : [];
  const pathMismatches = findPathMismatches(filesChangedArr, repoContext);
  if (pathMismatches.length > 0) {
    console.warn(`[pr-review] PR #${pr.prNumber} — path mismatches detected: ${pathMismatches.length}`);
  }
  // Reachability findings depend on the diff, which changes per iteration
  // (a fix-loop pass might add the missing page that wires up the
  // component). Recomputed inside the loop alongside the diff fetch.

  for (let iteration = 1; ; iteration++) {
    const tag = `[pr-review] PR #${pr.prNumber} round ${iteration}`;

    // Fetch fresh diff + head SHA (both reflect any fix commits from previous iterations)
    const fullDiff = await getPrDiff(headers, creds.owner, creds.repo, pr.prNumber);
    if (!fullDiff) {
      console.warn(`${tag} — could not fetch diff, stopping`);
      return;
    }
    // Deterministic scanners must run on the FULL diff — running them on a
    // truncated version silently misses files past the cap (e.g. the
    // page.tsx that wires up a component sitting after a huge globals.css
    // section), which produces false "unreachable" findings that loop the
    // fixer indefinitely. AI consumers get the truncated version so we
    // stay under the model's context window.
    const diff = truncateDiffForAi(fullDiff);
    const headSha = await getPrHead(headers, creds.owner, creds.repo, pr.prNumber);
    const ci = headSha
      ? await getCiStatus(headers, creds.owner, creds.repo, headSha)
      : { failures: [], pending: false, hasAnyChecks: false };

    // Mechanical CI fixers — `docs_inventory`, future lint/format checks,
    // etc. — produce their fix by running a script in a worktree, not by
    // asking the AI to hand-edit code. Run BEFORE the AI fixer so the
    // model never has to guess at a regenerated artifact. If a mechanical
    // fix pushes a commit, restart the loop iteration so reviewers see
    // the post-fix state and CI re-runs on the new HEAD.
    if (ci.failures.length > 0 && pr.branchName) {
      const mech = await applyMechanicalCiFixes(
        ci.failures.map((f) => f.name),
        { branchName: pr.branchName, headers, owner: creds.owner, repo: creds.repo },
      );
      if (mech.pushedChecks.length > 0) {
        await postPrComment(
          headers, creds.owner, creds.repo, pr.prNumber,
          `## 🛠️ Mechanical CI fix (round ${iteration})\n\nApplied scripted fixes for the following failing checks instead of running the AI fixer on them:\n\n${mech.log.join("\n")}\n\n---\n_Automated by xenoform.ai_`,
        );
        console.log(`${tag} — mechanical CI fixers pushed ${mech.pushedChecks.length} commit(s) (${mech.pushedChecks.join(", ")}); restarting iteration`);
        // Restart the loop iteration: re-fetch diff + CI on the new HEAD.
        // `continue` skips the rest of this round; iteration++ on the next
        // loop tick is fine — we don't bump the round counter manually.
        continue;
      }
      if (mech.handledChecks.length > 0) {
        console.log(`${tag} — mechanical CI fixers ran but produced no commits (${mech.handledChecks.join(", ")})`);
      }
    }

    // Run all three reviews in parallel. CI failures are folded into the
    // code reviewer's input so its verdict accounts for them directly,
    // rather than being treated as a separate signal.
    const unreachableComponents = findUnreachableComponents(filesChangedArr, fullDiff);
    if (unreachableComponents.length > 0) {
      console.warn(`${tag} — unreachable components detected: ${unreachableComponents.length}`);
    }
    // Catches the "wrong route prefix" failure mode — e.g. shipping a
    // settings page at `/settings/...` when this repo serves logged-in
    // users under `/app/...`. URL-reachable but invisible to real users.
    const misplacedPages = findMisplacedNewPages(filesChangedArr, repoContext);
    if (misplacedPages.length > 0) {
      console.warn(`${tag} — misplaced new pages detected: ${misplacedPages.length}`);
    }

    // Playwright QA: spin up the PR's code on a snapshot DB, click through
    // the live UI, screenshot, ask the model whether the feature is visible.
    // The helper returns a non-throwing result; we render it into a string
    // the QA reviewer's prompt treats as another hard-rule signal. Skipped
    // only when we don't yet have a branch name (which shouldn't happen at
    // this point but the type forces a guard).
    let playwrightFindings = "_(playwright QA skipped — PR branch name unavailable)_";
    if (pr.branchName) {
      console.log(`${tag} — running playwright QA...`);
      try {
        const pwResult = await runPlaywrightReview({
          branchName: pr.branchName,
          idea: { title: idea.title, description: idea.description },
          diff,
        });
        playwrightFindings = renderPlaywrightFindings(pwResult);
        console.log(`${tag} — playwright QA ran=${pwResult.ran} visible=${pwResult.verdict?.visible ?? "?"} (${(pwResult.durationMs / 1000).toFixed(1)}s)`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`${tag} — playwright QA threw (non-fatal): ${msg}`);
        playwrightFindings = `**Playwright QA harness threw an exception** (treat as UNCERTAIN): ${msg}`;
      }
    }

    const [codeReview, pmReview, qaReview] = await Promise.all([
      runCodeReview(diff, idea.title, ci.failures),
      runPmReview(diff, idea, linkedInsights, filesChangedStr),
      runQaReview(diff, idea, linkedInsights, filesChangedStr, repoContext, pathMismatches, unreachableComponents, misplacedPages, playwrightFindings),
    ]);

    // Post reviews as comments
    const iterLabel = ` (round ${iteration})`;
    await postPrComment(
      headers, creds.owner, creds.repo, pr.prNumber,
      `## 🔍 Code Review${iterLabel}\n\n${codeReview.text}\n\n---\n_Automated review by xenoform.ai_`,
    );
    await postPrComment(
      headers, creds.owner, creds.repo, pr.prNumber,
      `## 📋 PM Review${iterLabel}\n\n${pmReview.text}\n\n---\n_Automated review by xenoform.ai_`,
    );
    await postPrComment(
      headers, creds.owner, creds.repo, pr.prNumber,
      `## 🧪 QA Review${iterLabel}\n\n${qaReview.text}\n\n---\n_Automated review by xenoform.ai_`,
    );

    const allApproved = codeReview.verdict === "approved" && pmReview.verdict === "approved" && qaReview.verdict === "approved";
    // Pending CI no longer counts as clean: approving while a check is still
    // running leads to premature auto-merge attempts that then bounce back
    // into a rereview loop the moment the check finishes red. Only "all
    // checks completed AND none failed" passes this gate. "No checks at
    // all" still passes — projects without CI shouldn't be blocked here.
    const ciClean = ci.failures.length === 0 && !ci.pending;
    console.log(`${tag} — code: ${codeReview.verdict}, pm: ${pmReview.verdict}, qa: ${qaReview.verdict}, ci_failures: ${ci.failures.length}${ci.pending ? " (some pending)" : ""}`);

    // All reviewers approved AND CI green → auto-merge or request human review
    if (allApproved && ciClean) {
      const autoMerge = await shouldAutoMerge(db, idea.projectId);
      if (autoMerge) {
        await enqueueAutoMerge(pullRequestId);
        await postPrComment(
          headers, creds.owner, creds.repo, pr.prNumber,
          `## 🚀 Auto-merging\n\nAll three reviewers approved${ci.hasAnyChecks ? " and CI is green" : ""} and auto-merge is enabled for this project. This PR will be squash-merged shortly.\n\n---\n_Automated by xenoform.ai_`,
        );
        console.log(`${tag} — all green, auto-merge enqueued`);
      } else {
        await requestHumanReview(headers, creds.owner, creds.repo, pr.prNumber);
        console.log(`${tag} — all green, requested human review`);
      }
      return;
    }

    // Generate fix commit addressing the union of reviewer feedback + CI failures
    console.log(`${tag} — generating fixes...`);
    const fixes = await generateFixes(diff, codeReview, pmReview, qaReview, ci.failures);
    if (!fixes?.files?.length) {
      await postPrComment(
        headers, creds.owner, creds.repo, pr.prNumber,
        `⚠️ **Auto-fix could not generate changes for the review feedback.** A human should address the remaining issues.`,
      );
      console.warn(`${tag} — fix generation produced no files, stopping`);
      return;
    }

    // Push fix commits to the PR branch. If any individual commit fails
    // (e.g. the model emitted a path that GitHub rejects), stop the loop
    // gracefully with a comment instead of throwing — otherwise the
    // outer non-fatal handler swallows the error and the PR is left in
    // a half-fixed state with no signal to the user.
    try {
      for (const file of fixes.files) {
        await commitFile(headers, creds.owner, creds.repo, pr.branchName, file, fixes.commit_message);
      }
    } catch (commitErr) {
      const msg = commitErr instanceof Error ? commitErr.message : String(commitErr);
      await postPrComment(
        headers, creds.owner, creds.repo, pr.prNumber,
        `⚠️ **Auto-fix partially applied but stopped.** A subsequent fix commit failed: \`${msg}\`. A human should address the remaining review feedback.`,
      );
      console.warn(`${tag} — commitFile threw, stopping: ${msg}`);
      return;
    }

    // Update the tracked files on the PR record
    const allFiles = [
      ...((pr.filesChanged as { path: string; action: string }[]) ?? []),
      ...fixes.files.map((f) => ({ path: f.path, action: f.action })),
    ];
    const uniqueFiles = [...new Map(allFiles.map((f) => [f.path, f])).values()];
    await db.update(ideaPullRequests).set({
      filesChanged: uniqueFiles as unknown[],
      updatedAt: new Date(),
    }).where(eq(ideaPullRequests.id, pullRequestId));

    await postPrComment(
      headers, creds.owner, creds.repo, pr.prNumber,
      `## 🔧 Auto-fix${iterLabel}\n\n${fixes.summary}\n\nFiles updated:\n${fixes.files.map((f) => `- \`${f.path}\` (${f.action})`).join("\n")}\n\n---\n_Automated fix by xenoform.ai_`,
    );

    // If the fixer touched any package.json, regenerate yarn.lock in a
    // worktree and push it as a follow-up commit. Without this, the
    // package.json change would land on the branch with a stale lockfile
    // and CI would fail at `yarn install --frozen-lockfile` next run.
    const touchedPackageJson = fixes.files.some((f) => /(^|\/)package\.json$/.test(f.path));
    if (touchedPackageJson) {
      console.log(`${tag} — package.json changed, regenerating yarn.lock...`);
      const regen = await regenerateLockfile({
        branchName: pr.branchName,
        headers,
        owner: creds.owner,
        repo: creds.repo,
      });
      if (regen.pushed) {
        await postPrComment(
          headers, creds.owner, creds.repo, pr.prNumber,
          `## 📦 Lockfile regenerated${iterLabel}\n\nDependency changes in this round required regenerating \`yarn.lock\`. Pushed in ${(regen.durationMs / 1000).toFixed(1)}s.\n\n---\n_Automated by xenoform.ai_`,
        );
        console.log(`${tag} — yarn.lock pushed (${(regen.durationMs / 1000).toFixed(1)}s)`);
      } else if (!regen.ran) {
        await postPrComment(
          headers, creds.owner, creds.repo, pr.prNumber,
          `⚠️ **Lockfile regeneration failed**${iterLabel}: \`${regen.note ?? "unknown error"}\`. The next CI run may fail at \`yarn install --frozen-lockfile\` until \`yarn.lock\` is updated by hand.`,
        );
        console.warn(`${tag} — yarn.lock regen failed: ${regen.note}`);
      } else {
        console.log(`${tag} — yarn.lock unchanged (${regen.note})`);
      }
    }

    console.log(`${tag} — pushed ${fixes.files.length} fix file(s), re-reviewing...`);
  }
}
