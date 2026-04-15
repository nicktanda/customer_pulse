/**
 * AI idea relationship analysis — ports Rails IdeaLinker.
 * Identifies relationships between ideas.
 */
import { eq, desc } from "drizzle-orm";
import type { Database } from "@customer-pulse/db/client";
import { ideas, ideaRelationships } from "@customer-pulse/db/client";
import { callClaudeJson } from "./call-claude.js";

interface IdeaRelationship {
  idea_id: number;
  related_idea_id: number;
  relationship_type: string;
  explanation: string;
}

const RELATIONSHIP_MAP: Record<string, number> = { complementary: 0, alternative: 1, prerequisite: 2, conflicts: 3, extends: 4 };

const SYSTEM_PROMPT = `You are a product strategist analyzing relationships between proposed ideas. Identify meaningful relationships between the following ideas.

Relationship types:
- "complementary": ideas that work well together
- "alternative": ideas that solve the same problem differently (pick one)
- "prerequisite": one idea must be done before another
- "conflicts": ideas that conflict with each other
- "extends": one idea extends or builds upon another

For each relationship, return:
- "idea_id": the first idea's ID
- "related_idea_id": the second idea's ID
- "relationship_type": one of the types above
- "explanation": brief explanation of why this relationship exists

Only include meaningful relationships — don't force connections. Return a JSON array.
Respond with ONLY the JSON array, no markdown fences.`;

export async function linkIdeas(
  db: Database,
  projectId: number,
): Promise<number> {
  const allIdeas = await db
    .select({ id: ideas.id, title: ideas.title, description: ideas.description, ideaType: ideas.ideaType })
    .from(ideas)
    .where(eq(ideas.projectId, projectId))
    .orderBy(desc(ideas.createdAt))
    .limit(30);

  if (allIdeas.length < 2) return 0;

  const typeNames: Record<number, string> = { 0: "quick_win", 1: "feature", 2: "improvement", 3: "process_change", 4: "investigation" };

  const ideaList = allIdeas
    .map((i) => `[ID:${i.id}] [${typeNames[i.ideaType]}] ${i.title}: ${i.description.slice(0, 150)}`)
    .join("\n");

  const result = await callClaudeJson<IdeaRelationship[]>({
    system: SYSTEM_PROMPT,
    user: `Analyze relationships between these ${allIdeas.length} ideas:\n\n${ideaList}`,
    maxTokens: 4096,
  });

  if (!result || !Array.isArray(result)) return 0;

  const now = new Date();
  let created = 0;

  for (const rel of result) {
    if (!rel.idea_id || !rel.related_idea_id || rel.idea_id === rel.related_idea_id) continue;
    try {
      await db.insert(ideaRelationships).values({
        ideaId: rel.idea_id,
        relatedIdeaId: rel.related_idea_id,
        relationshipType: RELATIONSHIP_MAP[rel.relationship_type] ?? 0,
        explanation: rel.explanation ?? null,
        createdAt: now,
        updatedAt: now,
      });
      created++;
    } catch { /* duplicate — ignore */ }
  }

  return created;
}
