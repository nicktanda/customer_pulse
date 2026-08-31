"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject } from "@/lib/project-access";
import { callClaudeJsonWeb } from "@/lib/claude";
import { draftFromContext } from "@/lib/ai-drafts";
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

/**
 * Item 5a: drafts spec title + description from selected insight ids on /app/build/specs/new.
 * Returns JSON; the client component populates the title/description inputs.
 */
export async function draftSpecFromInsightsAction(insightIds: number[]): Promise<{
  ok: boolean;
  title?: string;
  description?: string;
  confidence?: number;
  suggestionId?: number | null;
  error?: string;
}> {
  const { projectId } = await requireEditor();
  const ids = insightIds.filter((n) => Number.isFinite(n) && n > 0).slice(0, 5);
  if (ids.length === 0) return { ok: false, error: "no_insights" };

  const db = await getRequestDb();
  const linked = await db
    .select({ id: insights.id, title: insights.title, description: insights.description })
    .from(insights)
    .where(inArray(insights.id, ids));

  if (linked.length === 0) return { ok: false, error: "not_found" };

  const context = linked
    .map((i) => `[insight ${i.id}] ${i.title}\n${i.description}`)
    .join("\n\n");

  const result = await draftFromContext<{ title: string; description: string }>({
    projectId,
    kind: "spec_draft",
    context,
  });

  if (!result) return { ok: false, error: "ai_unavailable" };
  return {
    ok: true,
    title: result.draft.title,
    description: result.draft.description,
    confidence: result.confidence,
    suggestionId: result.suggestionId,
  };
}

/**
 * Cross-cut E: clusters existing ideas by effort/impact and proposes roadmap items.
 *
 * Pulls all open ideas, groups by (effort, impact) bucket, asks Claude to compose 3-5
 * roadmap entries with linked idea ids. Used by the future "Suggest roadmap" button.
 */
export async function suggestRoadmapFromIdeasAction(): Promise<{
  ok: boolean;
  items?: { title: string; description: string; ideaIds: number[] }[];
  confidence?: number;
  suggestionId?: number | null;
  error?: string;
}> {
  const { projectId } = await requireEditor();
  const db = await getRequestDb();

  const { ideas } = await import("@customer-pulse/db/client");
  const ideaRows = await db
    .select({
      id: ideas.id,
      title: ideas.title,
      description: ideas.description,
      effort: ideas.effortEstimate,
      impact: ideas.impactEstimate,
    })
    .from(ideas)
    .where(eq(ideas.projectId, projectId))
    .limit(80);

  if (ideaRows.length < 3) return { ok: false, error: "not_enough_ideas" };

  const context = ideaRows
    .map((i) => `[idea ${i.id}] (effort=${i.effort} impact=${i.impact}) ${i.title}: ${i.description.slice(0, 200)}`)
    .join("\n");

  const result = await draftFromContext<{
    items: { title: string; description: string; ideaIds: number[] }[];
  }>({
    projectId,
    kind: "roadmap_cluster",
    context,
    maxTokens: 2000,
  });

  if (!result) return { ok: false, error: "ai_unavailable" };
  return {
    ok: true,
    items: result.draft.items,
    confidence: result.confidence,
    suggestionId: result.suggestionId,
  };
}

/**
 * Item 5b: given a free-text spec idea, suggests up to 5 existing insights that look related.
 * Used by the "Suggest related insights" pill on the spec form. Pure heuristic for now —
 * substring/keyword overlap. Avoids an AI call on every keystroke.
 */
export async function suggestInsightsForTextAction(text: string): Promise<{ ids: number[] }> {
  const { projectId } = await requireEditor();
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4);

  if (tokens.length === 0) return { ids: [] };

  const db = await getRequestDb();
  const all = await db
    .select({ id: insights.id, title: insights.title, description: insights.description })
    .from(insights)
    .where(eq(insights.projectId, projectId));

  const scored = all.map((i) => {
    const hay = `${i.title} ${i.description}`.toLowerCase();
    const score = tokens.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0);
    return { id: i.id, score };
  });

  return {
    ids: scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((s) => s.id),
  };
}
