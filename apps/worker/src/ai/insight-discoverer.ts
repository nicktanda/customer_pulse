/**
 * AI insight discovery — ports Rails InsightDiscoverer.
 * Analyzes batches of feedback to find patterns, problems, and opportunities.
 */
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "@customer-pulse/db/client";
import { feedbacks, insights, feedbackInsights } from "@customer-pulse/db/client";
import { callClaudeJson, resolveApiKey } from "./call-claude.js";

interface DiscoveredInsight {
  title: string;
  description: string;
  type: string;
  severity: string;
  confidence_score: number;
  affected_users_count: number;
  evidence: { feedback_id: number; relevance: number; summary: string }[];
}

const TYPE_MAP: Record<string, number> = { problem: 0, opportunity: 1, trend: 2, risk: 3, user_need: 4 };
const SEVERITY_MAP: Record<string, number> = { informational: 0, minor: 1, moderate: 2, major: 3, critical: 4 };

const SYSTEM_PROMPT = `You are a product insights analyst. Analyze a batch of customer feedback and identify distinct insights — patterns, problems, opportunities, trends, or user needs that emerge from the data.

For each insight, return:
- "title": concise title (< 100 chars)
- "description": 2-3 sentence explanation
- "type": one of "problem", "opportunity", "trend", "risk", "user_need"
- "severity": one of "informational", "minor", "moderate", "major", "critical"
- "confidence_score": 0-100 how confident you are
- "affected_users_count": estimated number of users affected
- "evidence": array of { "feedback_id": number, "relevance": 0.0-1.0, "summary": "why this feedback supports this insight" }

Return a JSON array of insight objects. Group related feedback into single insights — don't create one insight per feedback item. Aim for 3-8 meaningful insights per batch.

Respond with ONLY the JSON array, no markdown fences.`;

export async function discoverInsights(
  db: Database,
  projectId: number,
  batchSize: number = 25,
): Promise<{ created: number; remaining: boolean }> {
  const apiKey = await resolveApiKey();
  if (!apiKey) {
    return { created: 0, remaining: false };
  }

  // Fetch feedback that's been AI-processed but not yet analyzed for insights
  const batch = await db
    .select({ id: feedbacks.id, title: feedbacks.title, content: feedbacks.content, category: feedbacks.category, priority: feedbacks.priority, aiSummary: feedbacks.aiSummary })
    .from(feedbacks)
    .where(
      and(
        eq(feedbacks.projectId, projectId),
        sql`${feedbacks.aiProcessedAt} IS NOT NULL`,
        isNull(feedbacks.insightProcessedAt),
      ),
    )
    .limit(batchSize);

  if (batch.length === 0) {
    return { created: 0, remaining: false };
  }

  const categoryNames: Record<number, string> = { 0: "uncategorized", 1: "bug", 2: "feature_request", 3: "complaint" };
  const priorityNames: Record<number, string> = { 0: "unset", 1: "p1", 2: "p2", 3: "p3", 4: "p4" };

  const feedbackList = batch
    .map((f) => `[ID:${f.id}] [${categoryNames[f.category]}/${priorityNames[f.priority]}] ${f.title ?? "Untitled"}: ${f.aiSummary ?? f.content.slice(0, 200)}`)
    .join("\n");

  const result = await callClaudeJson<DiscoveredInsight[]>({
    system: SYSTEM_PROMPT,
    user: `Analyze these ${batch.length} feedback items and identify insights:\n\n${feedbackList}`,
    maxTokens: 4096,
  });

  const now = new Date();
  let created = 0;

  if (result && Array.isArray(result)) {
    for (const item of result) {
      const [newInsight] = await db.insert(insights).values({
        projectId,
        title: item.title ?? "Untitled Insight",
        description: item.description ?? "",
        insightType: TYPE_MAP[item.type] ?? 0,
        severity: SEVERITY_MAP[item.severity] ?? 0,
        confidenceScore: item.confidence_score ?? 50,
        affectedUsersCount: item.affected_users_count ?? 0,
        feedbackCount: item.evidence?.length ?? 0,
        status: 0, // discovered
        evidence: (item.evidence ?? []) as unknown[],
        metadata: {},
        discoveredAt: now,
        createdAt: now,
        updatedAt: now,
      }).returning({ id: insights.id });

      if (newInsight && item.evidence) {
        for (const ev of item.evidence) {
          if (typeof ev.feedback_id === "number") {
            try {
              await db.insert(feedbackInsights).values({
                feedbackId: ev.feedback_id,
                insightId: newInsight.id,
                relevanceScore: ev.relevance ?? 0.5,
                contributionSummary: ev.summary ?? null,
                createdAt: now,
                updatedAt: now,
              });
            } catch { /* duplicate — safe to ignore */ }
          }
        }
      }
      created++;
    }
  }

  // Mark batch as insight-processed
  const batchIds = batch.map((f) => f.id);
  for (const id of batchIds) {
    await db.update(feedbacks).set({ insightProcessedAt: now, updatedAt: now }).where(eq(feedbacks.id, id));
  }

  // Check if more remain
  const [more] = await db
    .select({ id: feedbacks.id })
    .from(feedbacks)
    .where(
      and(
        eq(feedbacks.projectId, projectId),
        sql`${feedbacks.aiProcessedAt} IS NOT NULL`,
        isNull(feedbacks.insightProcessedAt),
      ),
    )
    .limit(1);

  return { created, remaining: !!more };
}
