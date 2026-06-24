/**
 * Lockfile regeneration for auto-fix commits that touch `package.json`.
 *
 * When the fixer adds/removes/upgrades an npm dep, it can only emit a
 * `package.json` modify — it can't hand-write a valid `yarn.lock`. After
 * the fixer's commit lands, this helper checks out the branch into a temp
 * worktree, runs `yarn install` (without `--frozen-lockfile`) so yarn
 * computes the new resolution, and pushes the updated `yarn.lock` back
 * to the branch as a follow-up commit.
 *
 * Skipped (no commit, no error) if `yarn install` produces no change to
 * `yarn.lock` — e.g. the package.json change touched a dep yarn had
 * already resolved.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createPrWorktree } from "./playwright/lifecycle.js";
import { commitFile } from "./pr-creator.js";

export interface LockfileRegenResult {
  ran: boolean;
  pushed: boolean;
  /** Reason this finished without pushing (e.g. "no change", "install failed"). */
  note?: string;
  durationMs: number;
}

export async function regenerateLockfile(opts: {
  branchName: string;
  headers: Record<string, string>;
  owner: string;
  repo: string;
}): Promise<LockfileRegenResult> {
  const t0 = Date.now();
  const cleanups: Array<() => Promise<void>> = [];

  try {
    const worktree = await createPrWorktree(opts.branchName);
    cleanups.push(() => worktree.cleanup());

    // `yarn install` (no --frozen-lockfile) regenerates yarn.lock to match
    // the current package.json. `--ignore-engines` mirrors what we run at
    // the repo root so node-version mismatches don't block the regen.
    await runYarnInstall(worktree.path);

    const oldLock = await readFile(join(worktree.path, "yarn.lock"), "utf8").catch(() => null);
    // `git diff` against the branch's HEAD-committed lockfile tells us
    // whether yarn actually changed anything. Re-reading the file in the
    // worktree after install gives the post-install version; comparing
    // against the file on the branch tip (via git show) avoids a
    // round-trip through GitHub's API.
    const branchLock = await readFromGitRef(worktree.path, "yarn.lock");
    if (oldLock === null) {
      return { ran: true, pushed: false, note: "no yarn.lock present after install", durationMs: Date.now() - t0 };
    }
    if (branchLock !== null && branchLock === oldLock) {
      return { ran: true, pushed: false, note: "yarn.lock unchanged after install", durationMs: Date.now() - t0 };
    }

    await commitFile(
      opts.headers,
      opts.owner,
      opts.repo,
      opts.branchName,
      { path: "yarn.lock", action: "modify", content: oldLock },
      "chore: regenerate yarn.lock after dependency changes",
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

function runYarnInstall(cwd: string): Promise<void> {
  return new Promise((resolveP, reject) => {
    const child = spawn("yarn", ["install", "--ignore-engines", "--non-interactive"], { cwd });
    let stderr = "";
    child.stderr.on("data", (b: Buffer) => (stderr += b.toString()));
    child.on("close", (code) => {
      if (code === 0) resolveP();
      else reject(new Error(`yarn install exited ${code}: ${stderr.slice(0, 500)}`));
    });
    child.on("error", reject);
  });
}

function readFromGitRef(cwd: string, path: string): Promise<string | null> {
  return new Promise((resolveP) => {
    const child = spawn("git", ["show", `HEAD:${path}`], { cwd });
    let out = "";
    let err = "";
    child.stdout.on("data", (b: Buffer) => (out += b.toString()));
    child.stderr.on("data", (b: Buffer) => (err += b.toString()));
    child.on("close", (code) => resolveP(code === 0 ? out : null));
    child.on("error", () => resolveP(null));
  });
}
