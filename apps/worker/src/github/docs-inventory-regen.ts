/**
 * Docs-inventory regeneration for PRs that change `.claude/skills/` or other
 * inputs the `docs_inventory` CI check verifies.
 *
 * CI fails this check when `docs/skills-and-agents.md` is out of sync with
 * the actual skill metadata. The fix is purely mechanical — run
 * `yarn document-skills` and commit the regenerated file. The AI fixer
 * can't reliably hand-write the regenerated dump, so we handle it
 * deterministically in the worker (same pattern as `lockfile-regen`).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createPrWorktree, prepareNodeModules } from "./playwright/lifecycle.js";
import { commitFile } from "./pr-creator.js";

export interface DocsInventoryRegenResult {
  ran: boolean;
  pushed: boolean;
  note?: string;
  durationMs: number;
}

const DOCS_PATH = "docs/skills-and-agents.md";

export async function regenerateDocsInventory(opts: {
  branchName: string;
  headers: Record<string, string>;
  owner: string;
  repo: string;
}): Promise<DocsInventoryRegenResult> {
  const t0 = Date.now();
  const cleanups: Array<() => Promise<void>> = [];

  try {
    const worktree = await createPrWorktree(opts.branchName);
    cleanups.push(() => worktree.cleanup());
    // The script imports `yaml` from node_modules, so deps must be present.
    await prepareNodeModules(worktree.path);
    await runYarnCmd(worktree.path, ["document-skills"]);

    const regenerated = await readFile(join(worktree.path, DOCS_PATH), "utf8").catch(() => null);
    if (regenerated === null) {
      return { ran: true, pushed: false, note: `${DOCS_PATH} missing after regen`, durationMs: Date.now() - t0 };
    }
    const branchContent = await readFromGitRef(worktree.path, DOCS_PATH);
    if (branchContent !== null && branchContent === regenerated) {
      return { ran: true, pushed: false, note: `${DOCS_PATH} unchanged after regen`, durationMs: Date.now() - t0 };
    }

    await commitFile(
      opts.headers,
      opts.owner,
      opts.repo,
      opts.branchName,
      { path: DOCS_PATH, action: "modify", content: regenerated },
      "chore: regenerate docs/skills-and-agents.md",
    );
    return { ran: true, pushed: true, durationMs: Date.now() - t0 };
  } catch (err) {
    return {
      ran: false,
      pushed: false,
      note: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - t0,
    };
  } finally {
    for (const fn of cleanups.reverse()) {
      try { await fn(); } catch { /* ignore */ }
    }
  }
}

function runYarnCmd(cwd: string, args: string[]): Promise<void> {
  return new Promise((resolveP, reject) => {
    const child = spawn("yarn", [...args, "--ignore-engines"], { cwd });
    let stderr = "";
    child.stderr.on("data", (b: Buffer) => (stderr += b.toString()));
    child.on("close", (code) => {
      if (code === 0) resolveP();
      else reject(new Error(`yarn ${args.join(" ")} exited ${code}: ${stderr.slice(0, 500)}`));
    });
    child.on("error", reject);
  });
}

function readFromGitRef(cwd: string, path: string): Promise<string | null> {
  return new Promise((resolveP) => {
    const child = spawn("git", ["show", `HEAD:${path}`], { cwd });
    let out = "";
    child.stdout.on("data", (b: Buffer) => (out += b.toString()));
    child.on("close", (code) => resolveP(code === 0 ? out : null));
    child.on("error", () => resolveP(null));
  });
}
