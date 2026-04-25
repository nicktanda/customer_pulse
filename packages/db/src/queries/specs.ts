/**
 * Drizzle query helpers for the `specs` and `spec_insights` tables.
 *
 * These helpers are imported by server components and server actions in the web app.
 * All functions accept a `db` instance rather than creating their own connection,
 * so the caller controls the pool (matching the existing pattern across the codebase).
 */

import { eq, desc, sql, inArray, and } from "drizzle-orm";
import type { Database } from "../client";
import { specs, specInsights, insights } from "../schema";

// ─── Types ───────────────────────────────────────────────────────────────────

/** A single row returned by getSpecsByProject — everything the list view needs. */
export type SpecListRow = {
  id: number;
  title: string;
  status: number;
  insightCount: number;
  createdAt: Date;
  updatedAt: Date;
};

/** Input for createSpec — base form fields only (no AI content). */
export type CreateSpecInput = {
  projectId: number;
  title: string;
  description?: string | null;
  createdBy: number;
};

/**
 * Extended input for createSpec when Claude has drafted the spec sections.
 * All AI fields are optional so the action can pass an empty object on fallback.
 */
export type CreateSpecAiInput = CreateSpecInput & {
  userStories?: string[];
  acceptanceCriteria?: string[];
  successMetrics?: string[];
  outOfScope?: string[];
  risks?: string[];
  aiGenerated?: boolean;
};

/** Full spec row for the detail page, including linked insights. */
export type SpecDetailRow = {
  id: number;
  title: string;
  description: string | null;
  status: number;
  aiGenerated: boolean;
  userStories: string[];
  acceptanceCriteria: string[];
  successMetrics: string[];
  outOfScope: string[];
  risks: string[];
  createdAt: Date;
  updatedAt: Date;
  linkedInsights: { id: number; title: string }[];
};

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Returns all specs for a project, newest first, with a count of linked insights.
 * This is the data shape the spec list page needs.
 */
export async function getSpecsByProject(db: Database, projectId: number): Promise<SpecListRow[]> {
  const rows = await db
    .select({
      id: specs.id,
      title: specs.title,
      status: specs.status,
      createdAt: specs.createdAt,
      updatedAt: specs.updatedAt,
      // Count linked insights via a correlated subquery — avoids a JOIN + GROUP BY
      insightCount: sql<number>`(
        select count(*)::int
        from spec_insights si
        where si.spec_id = ${specs.id}
      )`,
    })
    .from(specs)
    .where(eq(specs.projectId, projectId))
    .orderBy(desc(specs.createdAt));

  return rows;
}

/**
 * Returns the full spec detail row for a given spec id, scoped to a project so
 * a user cannot read specs from a different project by guessing IDs.
 *
 * Returns null when the spec does not exist or belongs to a different project.
 * The linkedInsights array is populated via a second query on spec_insights + insights.
 */
export async function getSpecById(
  db: Database,
  specId: number,
  projectId: number,
): Promise<SpecDetailRow | null> {
  // Fetch the spec row itself, enforcing project scope
  const [spec] = await db
    .select({
      id: specs.id,
      title: specs.title,
      description: specs.description,
      status: specs.status,
      aiGenerated: specs.aiGenerated,
      userStories: specs.userStories,
      acceptanceCriteria: specs.acceptanceCriteria,
      successMetrics: specs.successMetrics,
      outOfScope: specs.outOfScope,
      risks: specs.risks,
      createdAt: specs.createdAt,
      updatedAt: specs.updatedAt,
    })
    .from(specs)
    .where(and(eq(specs.id, specId), eq(specs.projectId, projectId)));

  if (!spec) return null;

  // Fetch the linked insight ids from the join table
  const joinRows = await db
    .select({ insightId: specInsights.insightId })
    .from(specInsights)
    .where(eq(specInsights.specId, specId));

  const insightIds = joinRows.map((r) => r.insightId);

  // Resolve insight titles — only if there are linked insights
  let linkedInsights: { id: number; title: string }[] = [];
  if (insightIds.length > 0) {
    linkedInsights = await db
      .select({ id: insights.id, title: insights.title })
      .from(insights)
      .where(inArray(insights.id, insightIds));
  }

  return { ...spec, linkedInsights };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Inserts a new spec row and returns the new id.
 *
 * Accepts all AI-generated fields (userStories, acceptanceCriteria, successMetrics,
 * outOfScope, risks, aiGenerated) so the server action can populate them from Claude
 * before inserting — avoiding a second UPDATE round-trip.
 */
export async function createSpec(db: Database, input: CreateSpecAiInput): Promise<number> {
  const now = new Date();
  const [row] = await db
    .insert(specs)
    .values({
      projectId: input.projectId,
      title: input.title,
      description: input.description ?? null,
      createdBy: input.createdBy,
      userStories: input.userStories ?? [],
      acceptanceCriteria: input.acceptanceCriteria ?? [],
      successMetrics: input.successMetrics ?? [],
      outOfScope: input.outOfScope ?? [],
      risks: input.risks ?? [],
      aiGenerated: input.aiGenerated ?? false,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: specs.id });

  if (!row) {
    throw new Error("createSpec: insert did not return a row");
  }

  return row.id;
}

/**
 * Inserts rows into spec_insights for each insight id in the array.
 * Safe to call with an empty array (no-op).
 * Skips duplicates via ON CONFLICT DO NOTHING.
 */
export async function linkSpecToInsights(
  db: Database,
  specId: number,
  insightIds: number[],
): Promise<void> {
  if (insightIds.length === 0) {
    return;
  }

  const now = new Date();
  await db
    .insert(specInsights)
    .values(
      insightIds.map((insightId) => ({
        specId,
        insightId,
        createdAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoNothing();
}
