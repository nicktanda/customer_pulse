/**
 * AI idea generation — ports Rails IdeaGenerator.
 * Creates actionable solution ideas from insights.
 */
import { eq, desc } from "drizzle-orm";
import type { Database } from "@customer-pulse/db/client";
import { insights, ideas, ideaInsights } from "@customer-pulse/db/client";
import { callClaudeJson } from "./call-claude.js";

interface GeneratedIdea {
  title: string;
  description: string;
  type: string;
  effort_estimate: string;
  impact_estimate: string;
  confidence_score: number;
  rationale: string;
  risks: string;
  implementation_hints: string[];
  address_level: number;
}

const TYPE_MAP: Record<string, number> = { quick_win: 0, feature: 1, improvement: 2, process_change: 3, investigation: 4 };
const EFFORT_MAP: Record<string, number> = { trivial: 0, small: 1, medium: 2, large: 3, extra_large: 4 };
const IMPACT_MAP: Record<string, number> = { minimal: 0, low: 1, moderate: 2, high: 3, transformational: 4 };

const SYSTEM_PROMPT = `You are a product strategist. Given an insight about customer feedback, generate 1-3 actionable solution ideas.

For each idea, return:
- "title": concise title (< 100 chars)
- "description": 2-3 sentence description
- "type": one of "quick_win", "feature", "improvement", "process_change", "investigation"
- "effort_estimate": one of "trivial", "small", "medium", "large", "extra_large"
- "impact_estimate": one of "minimal", "low", "moderate", "high", "transformational"
- "confidence_score": 0-100 how confident you are this would work
- "rationale": why this idea addresses the insight
- "risks": potential risks or downsides
- "implementation_hints": array of specific implementation steps or considerations
- "address_level": 0-4 how fully this idea addresses the insight (0=barely, 4=completely)

Prioritize quick wins (high impact, low effort) when possible. Return a JSON array.
Respond with ONLY the JSON array, no markdown fences.`;

export async function generateIdeasForInsight(
  db: Database,
  insightId: number,
): Promise<number> {
  const [insight] = await db.select().from(insights).where(eq(insights.id, insightId)).limit(1);
  if (!insight) return 0;

  const severityNames: Record<number, string> = { 0: "informational", 1: "minor", 2: "moderate", 3: "major", 4: "critical" };
  const typeNames: Record<number, string> = { 0: "problem", 1: "opportunity", 2: "trend", 3: "risk", 4: "user_need" };

  const result = await callClaudeJson<GeneratedIdea[]>({
    system: SYSTEM_PROMPT,
    user: `Insight: "${insight.title}"\nType: ${typeNames[insight.insightType]}\nSeverity: ${severityNames[insight.severity]}\nAffected users: ~${insight.affectedUsersCount}\n\n${insight.description}`,
    maxTokens: 4096,
  });

  if (!result || !Array.isArray(result)) return 0;

  const now = new Date();
  let created = 0;

  for (const item of result) {
    const [newIdea] = await db.insert(ideas).values({
      projectId: insight.projectId,
      title: item.title ?? "Untitled Idea",
      description: item.description ?? "",
      ideaType: TYPE_MAP[item.type] ?? 0,
      effortEstimate: EFFORT_MAP[item.effort_estimate] ?? 2,
      impactEstimate: IMPACT_MAP[item.impact_estimate] ?? 2,
      confidenceScore: item.confidence_score ?? 50,
      status: 0, // proposed
      rationale: item.rationale ?? null,
      risks: item.risks ?? null,
      implementationHints: (item.implementation_hints ?? []) as unknown[],
      metadata: {},
      createdAt: now,
      updatedAt: now,
    }).returning({ id: ideas.id });

    if (newIdea) {
      try {
        await db.insert(ideaInsights).values({
          ideaId: newIdea.id,
          insightId: insight.id,
          addressLevel: item.address_level ?? 2,
          addressDescription: item.rationale ?? null,
          createdAt: now,
          updatedAt: now,
        });
      } catch { /* duplicate — ignore */ }
      created++;
    }
  }

  return created;
}

export async function generateIdeasForProject(
  db: Database,
  projectId: number,
): Promise<number> {
  // Get recent insights that don't have ideas yet
  const recentInsights = await db
    .select({ id: insights.id })
    .from(insights)
    .where(eq(insights.projectId, projectId))
    .orderBy(desc(insights.createdAt))
    .limit(20);

  let total = 0;
  for (const insight of recentInsights) {
    const count = await generateIdeasForInsight(db, insight.id);
    total += count;
  }
  return total;
}
