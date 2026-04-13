/**
 * AI pipeline orchestrator — ports Rails Insights::Orchestrator.
 * Coordinates the full analysis pipeline:
 *   Feedback → Insights → Themes → Ideas → Stakeholders → Link Ideas → Attack Groups
 */
import type { Database } from "@customer-pulse/db/client";
import { discoverInsights } from "./insight-discoverer.js";
import { generateIdeasForProject } from "./idea-generator.js";
import { identifyThemes } from "./theme-identifier.js";
import { identifyStakeholders } from "./stakeholder-identifier.js";
import { linkIdeas } from "./idea-linker.js";
import { buildAttackGroups, type AttackGroup } from "./attack-group-builder.js";
import { insights } from "@customer-pulse/db/client";
import { eq, desc } from "drizzle-orm";

export interface PipelineResult {
  insightsCreated: number;
  themesCreated: number;
  ideasCreated: number;
  stakeholdersCreated: number;
  relationshipsCreated: number;
  attackGroups: AttackGroup[];
}

export async function runFullPipeline(
  db: Database,
  projectId: number,
): Promise<PipelineResult> {
  console.log(`[orchestrator] Starting full pipeline for project ${projectId}`);

  // Step 1: Discover insights from unprocessed feedback
  let totalInsights = 0;
  let hasMore = true;
  while (hasMore) {
    const { created, remaining } = await discoverInsights(db, projectId);
    totalInsights += created;
    hasMore = remaining;
    if (hasMore) {
      console.log(`[orchestrator] Discovered ${created} insights, more remain...`);
    }
  }
  console.log(`[orchestrator] Total insights discovered: ${totalInsights}`);

  // Step 2: Identify themes from all insights
  const themesCreated = await identifyThemes(db, projectId);
  console.log(`[orchestrator] Themes created/updated: ${themesCreated}`);

  // Step 3: Generate ideas from insights
  const ideasCreated = await generateIdeasForProject(db, projectId);
  console.log(`[orchestrator] Ideas generated: ${ideasCreated}`);

  // Step 4: Identify stakeholders for recent insights
  let totalStakeholders = 0;
  const recentInsights = await db
    .select({ id: insights.id })
    .from(insights)
    .where(eq(insights.projectId, projectId))
    .orderBy(desc(insights.createdAt))
    .limit(20);

  for (const insight of recentInsights) {
    const count = await identifyStakeholders(db, insight.id);
    totalStakeholders += count;
  }
  console.log(`[orchestrator] Stakeholder segments identified: ${totalStakeholders}`);

  // Step 5: Link ideas
  const relationshipsCreated = await linkIdeas(db, projectId);
  console.log(`[orchestrator] Idea relationships created: ${relationshipsCreated}`);

  // Step 6: Build attack groups
  const attackGroups = await buildAttackGroups(db, projectId);
  console.log(`[orchestrator] Attack groups built: ${attackGroups.length}`);

  return {
    insightsCreated: totalInsights,
    themesCreated,
    ideasCreated,
    stakeholdersCreated: totalStakeholders,
    relationshipsCreated,
    attackGroups,
  };
}
