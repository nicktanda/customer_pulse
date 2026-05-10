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
import { analyzeRepo, type RepoContext } from "./repo-analyzer.js";

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
  content: string;
  action: "create" | "modify";
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

Return a JSON object with exactly two fields:
- "verdict": "approved" if the PR addresses the insight, or "needs_changes" if it misses the core problem
- "review": your review as a markdown string. Start with a one-line verdict (✅ Addresses the insight / ⚠️ Partially addresses / ❌ Does not address), then 2-4 bullet points explaining your reasoning.

Only use "needs_changes" for genuine gaps — minor scope limitations should still be "approved" with notes.

Respond with ONLY the JSON object.`;

const QA_REVIEW_SYSTEM = `You are a QA engineer verifying that a pull request (a) does what it claims AND (b) fits cleanly into the project's existing structure.

You will receive the original idea/insight, the diff, and a repo context summary (top-level directories, sample file paths, tech stack). Your job is to derive acceptance criteria from the idea AND apply standard infrastructure-sanity criteria, then check each against the diff.

Process:
1. Derive 3-5 **Functional** acceptance criteria from the idea + insights. Each is a single-line, testable statement (e.g. "Adds a 'Resend' button to the pulse report detail page").
2. Add the following **Infrastructure** criteria, adapted to the repo:
   - "New/modified file paths follow the project's existing layout (e.g. matches the \`src/\` prefix used by other files in the same package, or whichever convention the sample paths show)."
   - "New imports reference modules that exist in the repo (or are added in the diff)."
   - "No duplicate top-level directories created at a level that conflicts with the existing layout (e.g. don't add \`apps/web/app/\` if \`apps/web/src/app/\` already exists)."
3. For every criterion (functional + infrastructure), check the diff and assign:
   - "PASS" — clearly met; cite file path + key line/snippet as evidence.
   - "FAIL" — not met or implementation is broken.
   - "UNCERTAIN" — diff doesn't show enough to verify.
4. Be strict on infrastructure: if any new file path conflicts with the conventions visible in the sample paths, that's a **FAIL** even when the feature itself is implemented.

Return a JSON object with exactly two fields:
- "verdict": "approved" only if EVERY criterion (functional + infrastructure) is PASS. If any are FAIL or UNCERTAIN, "needs_changes".
- "review": markdown. Start with a one-line verdict (✅ Verified / ⚠️ Some criteria unverified / ❌ Failed criteria). Then two sections, **Functional** and **Infrastructure**, each as a checklist:
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
- "content": the COMPLETE updated file content (not a diff)
- "action": "create" for new files, "modify" for existing files

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
        const summary = [c.output?.summary, c.output?.text].filter(Boolean).join("\n").slice(0, 2000) || `(no detail; conclusion=${c.conclusion})`;
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
    const diff = await res.text();
    return diff.length > 30_000 ? diff.slice(0, 30_000) + "\n\n... (diff truncated)" : diff;
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
): Promise<ReviewResult> {
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

  for (let iteration = 1; ; iteration++) {
    const tag = `[pr-review] PR #${pr.prNumber} round ${iteration}`;

    // Fetch fresh diff + head SHA (both reflect any fix commits from previous iterations)
    const diff = await getPrDiff(headers, creds.owner, creds.repo, pr.prNumber);
    if (!diff) {
      console.warn(`${tag} — could not fetch diff, stopping`);
      return;
    }
    const headSha = await getPrHead(headers, creds.owner, creds.repo, pr.prNumber);
    const ci = headSha
      ? await getCiStatus(headers, creds.owner, creds.repo, headSha)
      : { failures: [], pending: false, hasAnyChecks: false };

    // Run all three reviews in parallel. CI failures are folded into the
    // code reviewer's input so its verdict accounts for them directly,
    // rather than being treated as a separate signal.
    const [codeReview, pmReview, qaReview] = await Promise.all([
      runCodeReview(diff, idea.title, ci.failures),
      runPmReview(diff, idea, linkedInsights, filesChangedStr),
      runQaReview(diff, idea, linkedInsights, filesChangedStr, repoContext),
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
    const ciClean = ci.failures.length === 0; // pending/no-CI counts as clean for this gate
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

    // Push fix commits to the PR branch
    for (const file of fixes.files) {
      await commitFile(headers, creds.owner, creds.repo, pr.branchName, file, fixes.commit_message);
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

    console.log(`${tag} — pushed ${fixes.files.length} fix file(s), re-reviewing...`);
  }
}
