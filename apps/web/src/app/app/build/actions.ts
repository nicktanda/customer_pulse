"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject } from "@/lib/project-access";
import { callClaudeJsonWeb } from "@/lib/claude";
import { insightTypeLabel, insightSeverityLabel } from "@/lib/insight-enums-display";
import {
  createSpec,
  linkSpecToInsights,
} from "@customer-pulse/db/queries/specs";
import { insights } from "@customer-pulse/db/client";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Shape of the JSON object Claude returns for spec generation.
 * Mirrors the output format defined in the spec-generation system prompt.
 */
type SpecDraft = {
  problemStatement: string;
  userStories: string[];
  acceptanceCriteria: string[];
  successMetrics: string[];
  outOfScope: string[];
  risks: string[];
};

// ─── System prompt ────────────────────────────────────────────────────────────

/**
 * System prompt for the spec-generation Claude call.
 * Defines the exact JSON shape and per-section rules.
 * Do not change — finalised in docs/sessions/2026-04-25/08-ai-spec-generation.md.
 */
const SPEC_SYSTEM_PROMPT = `You are a product spec writer. You receive a spec title, description, and optional customer insight evidence.
Write a complete product spec as a single JSON object.

Output format (return ONLY valid JSON, no prose outside it):
{
  "problemStatement": "2–3 sentences: who is affected, what the problem is, why it matters now",
  "userStories": [
    "As a [persona], I want [specific goal] so that [concrete benefit]"
  ],
  "acceptanceCriteria": [
    "Given [starting context] when [user action or system event] then [expected outcome]"
  ],
  "successMetrics": [
    "Measurable outcome with a number and time bound, e.g. '20 % of active users use the feature within 30 days'"
  ],
  "outOfScope": [
    "Explicit item this spec does NOT include, e.g. 'Bulk export across all projects'"
  ],
  "risks": [
    "Concrete risk or edge case, e.g. 'Large exports may time out for projects with >10k feedback items'"
  ]
}

Rules:
- Produce 3–5 user stories.
- Produce 1–2 acceptance criteria per user story (so 3–10 total).
- Produce 2–4 success metrics — each must be measurable.
- Produce 2–4 out-of-scope items — be explicit to prevent scope creep.
- Produce 2–3 risks.
- Ground every claim in the provided evidence — never invent data.
- If no evidence is provided, use the title and description only — still follow the format.
- Respond ONLY with the JSON object.`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Verifies the user is signed in, has an active project, and can edit it.
 * Returns userId + projectId so callers don't repeat the same auth dance.
 */
async function requireEditor() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = Number(session.user.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  if (projectId == null) {
    redirect("/app/projects");
  }
  if (!(await userCanEditProject(userId, projectId))) {
    redirect("/app/build/specs");
  }
  return { userId, projectId };
}

/**
 * Builds the user message sent to Claude for spec generation.
 * Includes title, optional description, and up to 5 insight evidence blocks.
 */
function buildSpecUserMessage(
  title: string,
  description: string | null,
  linkedInsights: {
    title: string;
    description: string;
    insightType: number;
    severity: number;
    affectedUsersCount: number;
    feedbackCount: number;
    evidence: unknown[];
  }[],
): string {
  const lines: string[] = [`Spec title: ${title}`];

  if (description) {
    lines.push("", description);
  }

  if (linkedInsights.length > 0) {
    lines.push("", "--- Customer evidence ---");
    for (const insight of linkedInsights) {
      lines.push(
        "",
        `Insight: ${insight.title}`,
        `Type: ${insightTypeLabel(insight.insightType)} | Severity: ${insightSeverityLabel(insight.severity)} | Affected users: ${insight.affectedUsersCount} | Feedback items: ${insight.feedbackCount}`,
        `Summary: ${insight.description}`,
      );
      // Include evidence snippets when available — Claude uses these to ground its claims
      const snippets = (insight.evidence as string[]).filter(
        (e) => typeof e === "string" && e.trim(),
      );
      if (snippets.length > 0) {
        lines.push("Evidence snippets:");
        for (const snippet of snippets) {
          lines.push(`- ${snippet}`);
        }
      }
    }
  }

  return lines.join("\n");
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Server action: creates a new spec row and links it to any selected insights.
 *
 * Flow:
 *   1. Validate title
 *   2. Fetch linked insights from DB using inArray() — no client-side filter
 *   3. Build the Claude user message from title + description + insight evidence
 *   4. Call Claude to draft the spec sections
 *   5. Insert the spec row with AI content (or empty arrays if Claude fails)
 *   6. Link insights and redirect to the spec detail page
 *
 * Form fields expected:
 *   title        (required)
 *   description  (optional)
 *   insight_ids  (optional, can be a repeated field — one value per selected insight)
 *
 * On success: redirects to /app/build/specs/[newId].
 * On validation failure: redirects back to the form with an error query param.
 */
export async function createSpecAction(formData: FormData): Promise<void> {
  const { userId, projectId } = await requireEditor();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!title) {
    redirect("/app/build/specs/new?error=required");
  }

  // insight_ids can be sent as a repeated field (one <input name="insight_ids"> per selection)
  const rawIds = formData.getAll("insight_ids");
  const insightIds = rawIds
    .map((v) => Number.parseInt(String(v), 10))
    .filter((n) => Number.isFinite(n) && n > 0);

  const db = await getRequestDb();

  // Fetch up to 5 linked insights from DB using SQL inArray — avoids fetching
  // all project insights and filtering in JavaScript
  let linkedInsights: {
    title: string;
    description: string;
    insightType: number;
    severity: number;
    affectedUsersCount: number;
    feedbackCount: number;
    evidence: unknown[];
  }[] = [];

  if (insightIds.length > 0) {
    linkedInsights = await db
      .select({
        title: insights.title,
        description: insights.description,
        insightType: insights.insightType,
        severity: insights.severity,
        affectedUsersCount: insights.affectedUsersCount,
        feedbackCount: insights.feedbackCount,
        evidence: insights.evidence,
      })
      .from(insights)
      .where(inArray(insights.id, insightIds.slice(0, 5)));
  }

  // Call Claude to draft all spec sections — falls back silently on any error
  let draft: SpecDraft | null = null;
  try {
    const userMessage = buildSpecUserMessage(title, description, linkedInsights);
    draft = await callClaudeJsonWeb<SpecDraft>({
      system: SPEC_SYSTEM_PROMPT,
      user: userMessage,
      maxTokens: 2048,
    });
  } catch (err) {
    // Claude call failed — proceed without AI content
    console.error(
      `[createSpecAction] Claude call failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // problemStatement from Claude becomes the spec description when no manual
  // description was provided — keeps the problem statement visible on the detail page
  const finalDescription =
    description ?? (draft?.problemStatement ? draft.problemStatement : null);

  const newId = await createSpec(db, {
    projectId,
    title,
    description: finalDescription,
    createdBy: userId,
    userStories: draft?.userStories ?? [],
    acceptanceCriteria: draft?.acceptanceCriteria ?? [],
    successMetrics: draft?.successMetrics ?? [],
    outOfScope: draft?.outOfScope ?? [],
    risks: draft?.risks ?? [],
    aiGenerated: draft != null,
  });

  await linkSpecToInsights(db, newId, insightIds);

  revalidatePath("/app/build/specs");
  redirect(`/app/build/specs/${newId}`);
}
