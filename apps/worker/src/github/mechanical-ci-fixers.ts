/**
 * Registry of "mechanical" CI failures — ones whose fix is to run a script
 * and commit the result, not to ask the AI to hand-edit code. Examples:
 *
 *   - `docs_inventory` fails when `docs/skills-and-agents.md` is out of
 *     sync with `.claude/skills/`. Fix: `yarn document-skills`.
 *
 * Each entry knows how to recognise its check, and runs a helper that
 * creates a worktree, runs the script, and pushes the regenerated file.
 *
 * Run BEFORE the AI fixer so reviewers see the post-fix state on the next
 * loop iteration. Failures here are non-fatal — they degrade into "the AI
 * fixer will try" rather than blocking the whole loop.
 */
import { regenerateDocsInventory } from "./docs-inventory-regen.js";

interface FixerContext {
  branchName: string;
  headers: Record<string, string>;
  owner: string;
  repo: string;
}

interface FixerEntry {
  /** Friendly identifier for logging + comments. */
  id: string;
  /** Returns true when this fixer applies to a given CI check name. */
  matches: (checkName: string) => boolean;
  /** Runs the fix; resolves with whether a commit landed and why/why-not. */
  run: (ctx: FixerContext) => Promise<{ ran: boolean; pushed: boolean; note?: string; durationMs: number }>;
  /** Short human description used in the PR comment posted on success. */
  description: string;
}

const FIXERS: FixerEntry[] = [
  {
    id: "docs-inventory",
    matches: (name) => name === "docs_inventory",
    run: regenerateDocsInventory,
    description: "regenerate `docs/skills-and-agents.md`",
  },
];

export interface MechanicalFixOutcome {
  /** Check names handled (whether the resulting commit pushed or was a no-op). */
  handledChecks: string[];
  /** Check names handled AND a commit was pushed — these will appear as a new commit on the branch. */
  pushedChecks: string[];
  /** Check names left for the AI fixer to try. */
  unhandledChecks: string[];
  /** Per-fixer log lines for the PR comment. */
  log: string[];
}

export async function applyMechanicalCiFixes(
  failureNames: string[],
  ctx: FixerContext,
): Promise<MechanicalFixOutcome> {
  const handled: string[] = [];
  const pushed: string[] = [];
  const unhandled: string[] = [];
  const log: string[] = [];

  for (const name of failureNames) {
    const fixer = FIXERS.find((f) => f.matches(name));
    if (!fixer) {
      unhandled.push(name);
      continue;
    }
    const result = await fixer.run(ctx);
    handled.push(name);
    const dur = `(${(result.durationMs / 1000).toFixed(1)}s)`;
    if (result.pushed) {
      pushed.push(name);
      log.push(`- ✅ \`${name}\` — ${fixer.description} ${dur}`);
    } else if (result.ran) {
      log.push(`- ➖ \`${name}\` — ran but pushed no commit: ${result.note ?? "no diff"} ${dur}`);
    } else {
      log.push(`- ⚠️ \`${name}\` — failed: ${result.note ?? "unknown"} ${dur}`);
    }
  }

  return { handledChecks: handled, pushedChecks: pushed, unhandledChecks: unhandled, log };
}
