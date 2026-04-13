/**
 * AI attack group builder — ports Rails AttackGroupBuilder.
 * Creates coordinated action bundles from insights, ideas, and themes.
 * Attack groups are ephemeral analysis results stored in pulse/reporting context.
 */
import { eq, desc } from "drizzle-orm";
import type { Database } from "@customer-pulse/db/client";
import { insights, ideas, themes } from "@customer-pulse/db/client";
import { callClaudeJson, resolveApiKey } from "./call-claude.js";

export interface AttackGroup {
  name: string;
  summary: string;
  idea_ids: number[];
  execution_order: string[];
  dependencies: string[];
  combined_effort: string;
  combined_impact: string;
  risks: string;
  success_metrics: string[];
}

const SYSTEM_PROMPT = `You are a product strategist creating coordinated action groups. Bundle related issues and solutions into 2-5 attack groups — each group is a coordinated set of actions that should be executed together for maximum impact.

For each attack group, return:
- "name": short name for the group (< 60 chars)
- "summary": 2-3 sentence executive summary
- "idea_ids": array of idea IDs to include in this group
- "execution_order": ordered array of step descriptions
- "dependencies": array of things that must be true before starting
- "combined_effort": one of "trivial", "small", "medium", "large", "extra_large"
- "combined_impact": one of "minimal", "low", "moderate", "high", "transformational"
- "risks": potential risks of executing this group
- "success_metrics": array of measurable success criteria

Return a JSON array of attack group objects.
Respond with ONLY the JSON array, no markdown fences.`;

export async function buildAttackGroups(
  db: Database,
  projectId: number,
): Promise<AttackGroup[]> {
  const apiKey = await resolveApiKey();
  if (!apiKey) return [];

  const recentInsights = await db
    .select({ id: insights.id, title: insights.title, description: insights.description, severity: insights.severity })
    .from(insights)
    .where(eq(insights.projectId, projectId))
    .orderBy(desc(insights.createdAt))
    .limit(20);

  const recentIdeas = await db
    .select({ id: ideas.id, title: ideas.title, description: ideas.description, effortEstimate: ideas.effortEstimate, impactEstimate: ideas.impactEstimate })
    .from(ideas)
    .where(eq(ideas.projectId, projectId))
    .orderBy(desc(ideas.createdAt))
    .limit(20);

  const recentThemes = await db
    .select({ id: themes.id, name: themes.name, description: themes.description, priorityScore: themes.priorityScore })
    .from(themes)
    .where(eq(themes.projectId, projectId))
    .orderBy(desc(themes.priorityScore))
    .limit(10);

  if (recentInsights.length === 0 && recentIdeas.length === 0) return [];

  const severityNames: Record<number, string> = { 0: "informational", 1: "minor", 2: "moderate", 3: "major", 4: "critical" };
  const effortNames: Record<number, string> = { 0: "trivial", 1: "small", 2: "medium", 3: "large", 4: "extra_large" };
  const impactNames: Record<number, string> = { 0: "minimal", 1: "low", 2: "moderate", 3: "high", 4: "transformational" };

  const context = [
    "INSIGHTS:",
    ...recentInsights.map((i) => `[ID:${i.id}] [${severityNames[i.severity]}] ${i.title}: ${i.description.slice(0, 120)}`),
    "",
    "IDEAS:",
    ...recentIdeas.map((i) => `[ID:${i.id}] [${effortNames[i.effortEstimate]}/${impactNames[i.impactEstimate]}] ${i.title}: ${i.description.slice(0, 120)}`),
    "",
    "THEMES:",
    ...recentThemes.map((t) => `[priority:${t.priorityScore}] ${t.name}: ${t.description?.slice(0, 100) ?? ""}`),
  ].join("\n");

  const result = await callClaudeJson<AttackGroup[]>({
    system: SYSTEM_PROMPT,
    user: `Create attack groups from these components:\n\n${context}`,
    maxTokens: 8192,
  });

  return result ?? [];
}
