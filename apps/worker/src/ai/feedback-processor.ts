/**
 * AI feedback classification — ports Rails FeedbackProcessor.
 * Categorizes, prioritizes, and summarizes feedback items.
 */
import { eq, isNull } from "drizzle-orm";
import type { Database } from "@customer-pulse/db/client";
import { feedbacks, projects } from "@customer-pulse/db/client";
import { callClaudeJson, resolveApiKey } from "./call-claude.js";

interface ClassificationResult {
  category: string;
  priority: string;
  summary: string;
  confidence_score: number;
  objective_alignment_score?: number;
  aligned_objective_ids?: number[];
}

const CATEGORY_MAP: Record<string, number> = { uncategorized: 0, bug: 1, feature_request: 2, complaint: 3 };
const PRIORITY_MAP: Record<string, number> = { unset: 0, p1: 1, p2: 2, p3: 3, p4: 4 };

const SYSTEM_PROMPT = `You are a product feedback classifier. Analyze customer feedback and return a JSON object with:
- "category": one of "bug", "feature_request", "complaint", "uncategorized"
- "priority": one of "p1" (critical/blocking), "p2" (high/important), "p3" (medium/nice-to-have), "p4" (low/minor)
- "summary": 2-3 sentence summary for a product manager
- "confidence_score": 0.0-1.0 how confident you are in the classification

Respond with ONLY the JSON object, no markdown fences.`;

const SYSTEM_PROMPT_WITH_OBJECTIVES = `You are a product feedback classifier. Analyze customer feedback and return a JSON object with:
- "category": one of "bug", "feature_request", "complaint", "uncategorized"
- "priority": one of "p1" (critical/blocking), "p2" (high/important), "p3" (medium/nice-to-have), "p4" (low/minor)
- "summary": 2-3 sentence summary for a product manager
- "confidence_score": 0.0-1.0 how confident you are in the classification
- "objective_alignment_score": 0.0-1.0 how aligned this feedback is with the business objectives (1.0 = directly supports critical objective)
- "aligned_objective_ids": array of objective IDs this feedback relates to (empty array if none)

Respond with ONLY the JSON object, no markdown fences.`;

export async function processFeedbackItem(
  db: Database,
  feedbackId: number,
): Promise<boolean> {
  const [row] = await db.select().from(feedbacks).where(eq(feedbacks.id, feedbackId)).limit(1);
  if (!row) return false;

  // Check for business objectives context
  const [proj] = await db
    .select({ objectives: projects.businessObjectives })
    .from(projects)
    .where(eq(projects.id, row.projectId))
    .limit(1);

  const hasObjectives = !!proj?.objectives?.trim();

  const userContent = hasObjectives
    ? `Business Objectives:\n${proj!.objectives}\n\nFeedback:\nTitle: ${row.title ?? "(none)"}\n\n${row.content}`
    : `Title: ${row.title ?? "(none)"}\n\n${row.content}`;

  const result = await callClaudeJson<ClassificationResult>({
    system: hasObjectives ? SYSTEM_PROMPT_WITH_OBJECTIVES : SYSTEM_PROMPT,
    user: userContent,
    maxTokens: 512,
  });

  const now = new Date();

  if (!result) {
    // Fallback: just mark as processed with defaults
    await db
      .update(feedbacks)
      .set({
        aiSummary: "AI classification unavailable — ANTHROPIC_API_KEY may not be set.",
        aiProcessedAt: now,
        aiConfidenceScore: 0,
        updatedAt: now,
      })
      .where(eq(feedbacks.id, feedbackId));
    return false;
  }

  await db
    .update(feedbacks)
    .set({
      category: CATEGORY_MAP[result.category] ?? 0,
      priority: PRIORITY_MAP[result.priority] ?? 0,
      aiSummary: result.summary ?? "No summary generated.",
      aiProcessedAt: now,
      aiConfidenceScore: result.confidence_score ?? 0.5,
      updatedAt: now,
    })
    .where(eq(feedbacks.id, feedbackId));

  return true;
}

export async function processFeedbackBatch(
  db: Database,
  batchSize: number = 100,
): Promise<{ processed: number; remaining: boolean }> {
  const apiKey = await resolveApiKey();
  if (!apiKey) {
    console.warn("[ai] ProcessFeedbackBatch skipped — no Anthropic API key configured");
    return { processed: 0, remaining: false };
  }

  // Fetch unprocessed feedbacks
  const unprocessed = await db
    .select({ id: feedbacks.id })
    .from(feedbacks)
    .where(isNull(feedbacks.aiProcessedAt))
    .limit(batchSize);

  let processed = 0;
  for (const row of unprocessed) {
    const ok = await processFeedbackItem(db, row.id);
    if (ok) processed++;
  }

  // Check if there are more
  const [remaining] = await db
    .select({ id: feedbacks.id })
    .from(feedbacks)
    .where(isNull(feedbacks.aiProcessedAt))
    .limit(1);

  return { processed, remaining: !!remaining };
}
