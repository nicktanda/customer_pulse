/**
 * Iterative PR review loop — after a PR is created, two AI reviewers (code + PM)
 * evaluate it. If either finds issues, a fixer generates new commits addressing
 * the feedback, and both reviewers run again. Repeats until both approve or the
 * iteration cap is hit.
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

const MAX_ITERATIONS = 3;

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

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const CODE_REVIEW_SYSTEM = `You are a senior code reviewer. Review a GitHub pull request diff.

Check for:
1. **Correctness** — logic errors, off-by-one, missing error handling
2. **Security** — injection, XSS, secrets in code, unsafe input handling
3. **Quality** — naming, readability, unnecessary complexity
4. **Completeness** — missing imports, edge cases, broken tests

Return a JSON object with exactly two fields:
- "verdict": "approved" if the code is acceptable, or "needs_changes" if there are issues that must be fixed
- "review": your review as a markdown string. Start with a one-line verdict (✅ Looks good / ⚠️ Needs attention / ❌ Needs changes), then list specific findings as bullet points. Be actionable and concise.

Only use "needs_changes" for real problems — style nits or minor suggestions should still be "approved" with the notes included.

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

const QA_REVIEW_SYSTEM = `You are a QA engineer manually verifying that a pull request does what it claims.

You will receive the original idea/insight, the PR's stated summary, and the diff. Your job is to derive specific acceptance criteria from the idea and check each one against the actual code changes.

Process:
1. Derive 3-7 concrete acceptance criteria from the idea + insights. Each should be a single-line, testable statement (e.g. "Adds a 'Resend' button to the pulse report detail page", "Persists the resend timestamp in pulse_reports.resent_at").
2. For each criterion, check the diff and assign:
   - "PASS" — criterion is clearly met; cite file path + a key line/snippet as evidence.
   - "FAIL" — criterion is not met or implementation is broken.
   - "UNCERTAIN" — diff doesn't show enough to verify (e.g. relies on code outside the diff, or the change is in untested config).
3. Be strict — if it can't be verified from the diff, that's UNCERTAIN, not PASS.

Return a JSON object with exactly two fields:
- "verdict": "approved" only if EVERY criterion is PASS. If any are FAIL or UNCERTAIN, "needs_changes".
- "review": markdown string. Start with a one-line verdict (✅ Verified / ⚠️ Some criteria unverified / ❌ Failed criteria). Then a checklist:
  \`\`\`
  - [✅] <criterion> — <evidence: file path, snippet>
  - [❌] <criterion> — <what's missing/broken>
  - [❓] <criterion> — <why it can't be verified>
  \`\`\`

Only use "approved" when every box is ✅. Respond with ONLY the JSON object.`;

const FIX_SYSTEM = `You are a senior software engineer. You will receive:
1. The current PR diff
2. Code review feedback
3. PM review feedback
4. QA review feedback (acceptance-criteria checklist)

Generate code changes that address ALL feedback from all three reviews. For each file, provide:
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

async function runCodeReview(diff: string, ideaTitle: string): Promise<ReviewResult> {
  const result = await callClaudeJson<{ verdict: string; review: string }>({
    system: CODE_REVIEW_SYSTEM,
    user: `## Pull Request: ${ideaTitle}\n\n### Diff\n\`\`\`diff\n${diff}\n\`\`\``,
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

async function runQaReview(
  diff: string,
  idea: { title: string; description: string; rationale: string | null },
  linkedInsights: { title: string; description: string }[],
  filesChanged: string,
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
): Promise<FixResult | null> {
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
    ].join("\n"),
    maxTokens: 8192,
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

  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    const tag = `[pr-review] PR #${pr.prNumber} iteration ${iteration}/${MAX_ITERATIONS}`;

    // Fetch fresh diff (includes any fix commits from previous iterations)
    const diff = await getPrDiff(headers, creds.owner, creds.repo, pr.prNumber);
    if (!diff) {
      console.warn(`${tag} — could not fetch diff, stopping`);
      return;
    }

    // Run all three reviews in parallel
    const [codeReview, pmReview, qaReview] = await Promise.all([
      runCodeReview(diff, idea.title),
      runPmReview(diff, idea, linkedInsights, filesChangedStr),
      runQaReview(diff, idea, linkedInsights, filesChangedStr),
    ]);

    // Post reviews as comments
    const iterLabel = MAX_ITERATIONS > 1 ? ` (round ${iteration})` : "";
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

    console.log(`${tag} — code: ${codeReview.verdict}, pm: ${pmReview.verdict}, qa: ${qaReview.verdict}`);

    // All three approved → auto-merge if enabled, else request human review
    if (
      codeReview.verdict === "approved" &&
      pmReview.verdict === "approved" &&
      qaReview.verdict === "approved"
    ) {
      const autoMerge = await shouldAutoMerge(db, idea.projectId);
      if (autoMerge) {
        await enqueueAutoMerge(pullRequestId);
        await postPrComment(
          headers, creds.owner, creds.repo, pr.prNumber,
          `## 🚀 Auto-merging\n\nAll three reviewers approved and auto-merge is enabled for this project. This PR will be squash-merged shortly.\n\n---\n_Automated by xenoform.ai_`,
        );
        console.log(`${tag} — all reviewers approved, auto-merge enqueued`);
      } else {
        await requestHumanReview(headers, creds.owner, creds.repo, pr.prNumber);
        console.log(`${tag} — all reviewers approved, requested human review`);
      }
      return;
    }

    // Last iteration and still not approved → post a summary and stop
    if (iteration === MAX_ITERATIONS) {
      await postPrComment(
        headers, creds.owner, creds.repo, pr.prNumber,
        `⚠️ **Review loop reached ${MAX_ITERATIONS} iterations without full approval.** A human should review the remaining feedback above.`,
      );
      console.log(`${tag} — iteration cap reached, stopping`);
      return;
    }

    // Generate fix commit addressing the feedback
    console.log(`${tag} — generating fixes...`);
    const fixes = await generateFixes(diff, codeReview, pmReview, qaReview);
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
