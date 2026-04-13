/**
 * AI stakeholder identification — ports Rails StakeholderIdentifier.
 * Identifies affected user segments per insight.
 */
import { eq, sql } from "drizzle-orm";
import type { Database } from "@customer-pulse/db/client";
import { insights, stakeholderSegments, insightStakeholders } from "@customer-pulse/db/client";
import { callClaudeJson } from "./call-claude.js";

interface IdentifiedStakeholder {
  name: string;
  segment_type: string;
  description: string;
  size_estimate: number;
  engagement_priority: number;
  engagement_strategy: string;
  characteristics: string[];
  impact_level: number;
  impact_description: string;
}

const SEGMENT_TYPE_MAP: Record<string, number> = { user_segment: 0, internal_team: 1, customer_tier: 2, use_case_group: 3, geographic_region: 4 };

const SYSTEM_PROMPT = `You are a stakeholder analyst. Given an insight about customer feedback, identify 2-5 stakeholder segments that are affected.

For each stakeholder, return:
- "name": segment name (< 60 chars)
- "segment_type": one of "user_segment", "internal_team", "customer_tier", "use_case_group", "geographic_region"
- "description": 1-2 sentence description
- "size_estimate": estimated number of people in this segment
- "engagement_priority": 0-5 how urgently this segment should be engaged (5=most urgent)
- "engagement_strategy": recommended approach for this segment
- "characteristics": array of key traits
- "impact_level": 0-4 how severely this insight impacts this segment
- "impact_description": brief description of the impact

Return a JSON array. Respond with ONLY the JSON array, no markdown fences.`;

export async function identifyStakeholders(
  db: Database,
  insightId: number,
): Promise<number> {
  const [insight] = await db.select().from(insights).where(eq(insights.id, insightId)).limit(1);
  if (!insight) return 0;

  const typeNames: Record<number, string> = { 0: "problem", 1: "opportunity", 2: "trend", 3: "risk", 4: "user_need" };
  const result = await callClaudeJson<IdentifiedStakeholder[]>({
    system: SYSTEM_PROMPT,
    user: `Insight: "${insight.title}" (${typeNames[insight.insightType]})\n\n${insight.description}`,
    maxTokens: 2048,
  });

  if (!result || !Array.isArray(result)) return 0;

  const now = new Date();
  let created = 0;

  for (const item of result) {
    // Find or create stakeholder segment by name
    const [existing] = await db
      .select({ id: stakeholderSegments.id })
      .from(stakeholderSegments)
      .where(sql`lower(${stakeholderSegments.name}) = ${(item.name ?? "").toLowerCase()} AND ${stakeholderSegments.projectId} = ${insight.projectId}`)
      .limit(1);

    let segmentId: number;
    if (existing) {
      segmentId = existing.id;
    } else {
      const [newSeg] = await db.insert(stakeholderSegments).values({
        projectId: insight.projectId,
        name: item.name ?? "Unknown Segment",
        segmentType: SEGMENT_TYPE_MAP[item.segment_type] ?? 0,
        description: item.description ?? null,
        sizeEstimate: item.size_estimate ?? 0,
        engagementPriority: item.engagement_priority ?? 0,
        engagementStrategy: item.engagement_strategy ?? null,
        characteristics: (item.characteristics ?? []) as unknown[],
        metadata: {},
        createdAt: now,
        updatedAt: now,
      }).returning({ id: stakeholderSegments.id });
      if (!newSeg) continue;
      segmentId = newSeg.id;
      created++;
    }

    // Link to insight
    try {
      await db.insert(insightStakeholders).values({
        insightId,
        stakeholderSegmentId: segmentId,
        impactLevel: item.impact_level ?? 2,
        impactDescription: item.impact_description ?? null,
        createdAt: now,
        updatedAt: now,
      });
    } catch { /* duplicate — ignore */ }
  }

  return created;
}
