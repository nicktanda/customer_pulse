/**
 * AI theme identification — ports Rails ThemeIdentifier.
 * Groups insights into high-level themes.
 */
import { eq, desc, sql } from "drizzle-orm";
import type { Database } from "@customer-pulse/db/client";
import { insights, themes, insightThemes } from "@customer-pulse/db/client";
import { callClaudeJson, resolveApiKey } from "./call-claude.js";

interface IdentifiedTheme {
  name: string;
  description: string;
  priority_score: number;
  affected_users_estimate: number;
  insight_ids: number[];
  relevance_scores: Record<string, number>;
}

const SYSTEM_PROMPT = `You are a product strategist analyzing customer insights. Group these insights into 3-7 high-level themes that capture the major patterns.

For each theme, return:
- "name": short theme name (< 60 chars)
- "description": 1-2 sentence description of what this theme represents
- "priority_score": 0-100 based on severity and breadth of the underlying insights
- "affected_users_estimate": total estimated users affected across all insights in this theme
- "insight_ids": array of insight IDs that belong to this theme
- "relevance_scores": object mapping insight_id to relevance score (0.0-1.0)

An insight can belong to multiple themes. Higher priority scores should be given to themes with more severe or widespread issues.

Return a JSON array of theme objects.
Respond with ONLY the JSON array, no markdown fences.`;

export async function identifyThemes(
  db: Database,
  projectId: number,
): Promise<number> {
  const apiKey = await resolveApiKey();
  if (!apiKey) return 0;

  const allInsights = await db
    .select({ id: insights.id, title: insights.title, description: insights.description, insightType: insights.insightType, severity: insights.severity, affectedUsersCount: insights.affectedUsersCount })
    .from(insights)
    .where(eq(insights.projectId, projectId))
    .orderBy(desc(insights.createdAt))
    .limit(50);

  if (allInsights.length < 2) return 0;

  const typeNames: Record<number, string> = { 0: "problem", 1: "opportunity", 2: "trend", 3: "risk", 4: "user_need" };
  const severityNames: Record<number, string> = { 0: "informational", 1: "minor", 2: "moderate", 3: "major", 4: "critical" };

  const insightList = allInsights
    .map((i) => `[ID:${i.id}] [${typeNames[i.insightType]}/${severityNames[i.severity]}] ${i.title}: ${i.description.slice(0, 150)}`)
    .join("\n");

  const result = await callClaudeJson<IdentifiedTheme[]>({
    system: SYSTEM_PROMPT,
    user: `Analyze these ${allInsights.length} insights and group them into themes:\n\n${insightList}`,
    maxTokens: 4096,
  });

  if (!result || !Array.isArray(result)) return 0;

  const now = new Date();
  let created = 0;

  for (const item of result) {
    // Find or create theme by name (case-insensitive)
    const [existing] = await db
      .select({ id: themes.id })
      .from(themes)
      .where(sql`lower(${themes.name}) = ${(item.name ?? "").toLowerCase()} AND ${themes.projectId} = ${projectId}`)
      .limit(1);

    let themeId: number;
    if (existing) {
      await db.update(themes).set({
        description: item.description ?? undefined,
        priorityScore: item.priority_score ?? 0,
        affectedUsersEstimate: item.affected_users_estimate ?? 0,
        insightCount: item.insight_ids?.length ?? 0,
        analyzedAt: now,
        updatedAt: now,
      }).where(eq(themes.id, existing.id));
      themeId = existing.id;
    } else {
      const [newTheme] = await db.insert(themes).values({
        projectId,
        name: item.name ?? "Unnamed Theme",
        description: item.description ?? null,
        priorityScore: item.priority_score ?? 0,
        affectedUsersEstimate: item.affected_users_estimate ?? 0,
        insightCount: item.insight_ids?.length ?? 0,
        metadata: {},
        analyzedAt: now,
        createdAt: now,
        updatedAt: now,
      }).returning({ id: themes.id });
      if (!newTheme) continue;
      themeId = newTheme.id;
      created++;
    }

    // Link insights to theme
    if (item.insight_ids) {
      for (const insightId of item.insight_ids) {
        const relevance = item.relevance_scores?.[String(insightId)] ?? 0.5;
        try {
          await db.insert(insightThemes).values({
            insightId,
            themeId,
            relevanceScore: relevance,
            createdAt: now,
            updatedAt: now,
          });
        } catch { /* duplicate — ignore */ }
      }
    }
  }

  return created;
}
