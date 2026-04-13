/**
 * AI objective alignment — ports Rails ObjectiveAligner.
 * Scores alignment of feedback/insights/ideas against business objectives.
 */
import { eq } from "drizzle-orm";
import type { Database } from "@customer-pulse/db/client";
import { projects } from "@customer-pulse/db/client";
import { callClaudeJson } from "./call-claude.js";

export interface AlignmentResult {
  alignment_score: number;
  aligned_objective_ids: number[];
  contradicted_objective_ids: number[];
  analysis: string;
  business_impact: string;
}

const SYSTEM_PROMPT = `You are a business strategist evaluating alignment between customer feedback/insights and business objectives.

Score the alignment and return a JSON object with:
- "alignment_score": 0.0-1.0 (1.0 = directly supports a critical objective)
- "aligned_objective_ids": array of objective indices (0-based) that this item supports
- "contradicted_objective_ids": array of objective indices this item contradicts
- "analysis": 1-2 sentence analysis of the alignment
- "business_impact": 1-2 sentence assessment of business impact

Respond with ONLY the JSON object, no markdown fences.`;

export async function analyzeAlignment(
  db: Database,
  projectId: number,
  itemType: "feedback" | "insight" | "idea",
  title: string,
  description: string,
): Promise<AlignmentResult | null> {
  const [proj] = await db
    .select({ objectives: projects.businessObjectives, strategy: projects.businessStrategy })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!proj?.objectives?.trim()) return null;

  const result = await callClaudeJson<AlignmentResult>({
    system: SYSTEM_PROMPT,
    user: `Business Objectives:\n${proj.objectives}\n\n${proj.strategy ? `Strategy:\n${proj.strategy}\n\n` : ""}${itemType.charAt(0).toUpperCase() + itemType.slice(1)}: "${title}"\n\n${description}`,
    maxTokens: 1024,
  });

  return result;
}
