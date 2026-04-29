/**
 * Infra-2: typed wrapper that funnels every "Draft from..." server action through the
 * web-side Claude helper and writes the result to ai_suggestions for audit/replay.
 *
 * Adding a new draft kind = (1) add a case to PROMPTS, (2) define a payload type,
 * (3) call `draftFromContext({ kind, context })` from your server action.
 */

import { getRequestDb } from "@/lib/db";
import { aiSuggestions } from "@customer-pulse/db/client";
import { callClaudeJsonWeb } from "@/lib/claude";

export type DraftKind =
  | "spec_draft"
  | "insight_draft"
  | "strategy_draft"
  | "activity_draft"
  | "project_infer"
  | "roadmap_cluster"
  | "ost_opportunities"
  | "tag_propose"
  /** Ordered list of discovery activity types + titles so the team can decide what solution to build. */
  | "discovery_plan";

export interface DraftEnvelope<T> {
  draft: T;
  confidence: number;
  /** Optional list of source-record references the model cited (e.g. insight ids). */
  sources: { kind: string; id: number; snippet?: string }[];
  /** ai_suggestions.id — pass back when accepting so we can record acceptance. */
  suggestionId: number | null;
}

const SYSTEM_PROMPTS: Record<DraftKind, string> = {
  spec_draft: `You draft product specs. Given linked customer insights, write a clear title and a 2-3 paragraph description that references the user problem. Return JSON: {"title": string, "description": string, "confidence": number 0-1, "sources": [{"kind":"insight","id":number,"snippet":string}]}.`,
  insight_draft: `You synthesise customer insights from feedback snippets. Return JSON: {"title": string (max 80 chars), "description": string (2-3 sentences), "confidence": number 0-1, "sources": [{"kind":"feedback","id":number,"snippet":string}]}.`,
  strategy_draft: `You are a senior PM. Given a corpus of insights and themes, draft business objectives (3-5 bullet points) and a strategy paragraph. Return JSON: {"objectives": string, "strategy": string, "confidence": number 0-1, "sources": [{"kind":"insight","id":number,"snippet":string}]}.`,
  activity_draft: `You draft a discovery activity title given an insight title and activity type. Return JSON: {"title": string (max 80 chars), "confidence": number 0-1, "sources":[]}.`,
  project_infer: `You name and describe a software project from integration metadata. Return JSON: {"name": string, "description": string, "confidence": number 0-1, "sources":[]}.`,
  roadmap_cluster: `You bucket product ideas by effort/impact and propose roadmap items. Return JSON: {"items": [{"title": string, "description": string, "ideaIds": number[]}], "confidence": number 0-1, "sources":[]}.`,
  ost_opportunities: `You cluster product insights into 3-6 opportunity statements for an Opportunity Solution Tree. Return JSON: {"opportunities": [{"title": string, "insightIds": number[]}], "confidence": number 0-1, "sources":[]}.`,
  tag_propose: `You propose tags for customer feedback given existing human-applied examples. Return JSON: {"tags": [{"feedbackId": number, "tagName": string, "confidence": number}], "confidence": number 0-1, "sources":[]}.`,
  discovery_plan: `You propose a discovery plan so the product team can decide WHAT SOLUTION TO BUILD (scope, viability, differentiation) — not generic research busywork.

Use ONLY these activity types as integers in each item:
1 = Interview guide (deep qualitative exploration with affected users),
2 = Survey (structured quant or segment check at scale),
3 = Assumption map (expose and test risky beliefs before building),
4 = Competitor scan (alternatives buyers use today),
5 = Data query (metrics/evidence gaps),
6 = Desk research (secondary sources, no AI draft inside that activity itself),
7 = Prototype hypothesis (what to falsify fast with prototypes).

Return JSON ONLY:
{"activities":[{"activityType":1-7,"title":string (max 100 chars),"rationale":string}],"confidence":number 0-1,"sources":[]}.

Rules:
- Order activities from "do first" to "do later" (dependencies matter).
- Suggest **4–7** items mixing types so uncertainty about the **solution shape** decreases.
- In each rationale, say what decision this unlocks for **building**.
- Prefer types not already strongly covered below when that would be redundant.`,
};

export async function draftFromContext<T extends Record<string, unknown>>(opts: {
  projectId: number;
  kind: DraftKind;
  context: string;
  /** When set, link the suggestion row to a specific target (e.g. existing spec id) for audit. */
  target?: { table: string; id: number };
  maxTokens?: number;
}): Promise<DraftEnvelope<T> | null> {
  const result = await callClaudeJsonWeb<T & { confidence?: number; sources?: { kind: string; id: number; snippet?: string }[] }>({
    system: SYSTEM_PROMPTS[opts.kind],
    user: opts.context,
    maxTokens: opts.maxTokens ?? 1500,
  });

  if (!result) return null;

  const confidence = typeof result.confidence === "number" ? result.confidence : 0.5;
  const sources = Array.isArray(result.sources) ? result.sources : [];

  // Persist for audit / replay. Failure here is non-fatal — surface still works.
  let suggestionId: number | null = null;
  try {
    const db = await getRequestDb();
    const inserted = await db
      .insert(aiSuggestions)
      .values({
        projectId: opts.projectId,
        kind: opts.kind,
        targetTable: opts.target?.table ?? null,
        targetId: opts.target?.id ?? null,
        payload: { v: 1, draft: result, sources },
        confidence,
        createdAt: new Date(),
      })
      .returning({ id: aiSuggestions.id });
    suggestionId = inserted[0]?.id ?? null;
  } catch (err) {
    console.error(`[ai-drafts] Failed to log ai_suggestion: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {
    draft: result as T,
    confidence,
    sources,
    suggestionId,
  };
}

/**
 * Mark a suggestion as accepted. Server actions call this when the user clicks Accept.
 * Soft-fails — acceptance tracking is best-effort.
 */
export async function recordAcceptance(suggestionId: number, userId: number): Promise<void> {
  try {
    const db = await getRequestDb();
    const { eq } = await import("drizzle-orm");
    await db
      .update(aiSuggestions)
      .set({ acceptedAt: new Date(), acceptedBy: userId })
      .where(eq(aiSuggestions.id, suggestionId));
  } catch (err) {
    console.error(`[ai-drafts] Failed to record acceptance: ${err instanceof Error ? err.message : String(err)}`);
  }
}
