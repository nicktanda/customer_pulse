import { and, eq, isNotNull, isNull, sql, type SQL } from "drizzle-orm";
import { feedbacks } from "@customer-pulse/db/client";

export type FeedbackSearchParams = {
  source?: string;
  category?: string;
  priority?: string;
  status?: string;
  q?: string;
  /** `pending` = not yet AI-processed; `processed` = has `ai_processed_at`. */
  ai?: string;
};

/**
 * Builds Drizzle `WHERE` fragments for the feedback list filters (status, source, search, etc.).
 */
export function buildFeedbackConditions(projectId: number, sp: FeedbackSearchParams): SQL {
  const parts: SQL[] = [eq(feedbacks.projectId, projectId)];

  if (sp.source != null && sp.source !== "") {
    const n = Number(sp.source);
    if (Number.isFinite(n)) {
      parts.push(eq(feedbacks.source, n));
    }
  }
  if (sp.category != null && sp.category !== "") {
    const n = Number(sp.category);
    if (Number.isFinite(n)) {
      parts.push(eq(feedbacks.category, n));
    }
  }
  if (sp.priority != null && sp.priority !== "") {
    const n = Number(sp.priority);
    if (Number.isFinite(n)) {
      parts.push(eq(feedbacks.priority, n));
    }
  }
  if (sp.status != null && sp.status !== "") {
    const n = Number(sp.status);
    if (Number.isFinite(n)) {
      parts.push(eq(feedbacks.status, n));
    }
  }

  if (sp.ai === "pending") {
    parts.push(isNull(feedbacks.aiProcessedAt));
  } else if (sp.ai === "processed") {
    parts.push(isNotNull(feedbacks.aiProcessedAt));
  }

  const q = sp.q?.trim();
  if (q) {
    const safe = `%${q.replace(/%/g, "").replace(/_/g, "")}%`;
    parts.push(
      sql`(${feedbacks.title} ILIKE ${safe} OR ${feedbacks.content} ILIKE ${safe} OR ${feedbacks.authorName} ILIKE ${safe} OR ${feedbacks.authorEmail} ILIKE ${safe})`,
    );
  }

  return parts.length === 1 ? parts[0]! : and(...parts)!;
}
