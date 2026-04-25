/**
 * Drizzle query helpers for the `specs` and `spec_insights` tables.
 *
 * These helpers are imported by server components and server actions in the web app.
 * All functions accept a `db` instance rather than creating their own connection,
 * so the caller controls the pool (matching the existing pattern across the codebase).
 */

import { eq, desc, sql } from "drizzle-orm";
import type { Database } from "../client";
import { specs, specInsights } from "../schema";

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

/** Input for createSpec — mirrors the spec form fields. */
export type CreateSpecInput = {
  projectId: number;
  title: string;
  description?: string | null;
  createdBy: number;
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

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Inserts a new spec row and returns the new id.
 *
 * Note: description is stored in the `description` column added to the specs table.
 * user_stories and acceptance_criteria start empty (filled later by the PM or AI).
 */
export async function createSpec(db: Database, input: CreateSpecInput): Promise<number> {
  const now = new Date();
  const [row] = await db
    .insert(specs)
    .values({
      projectId: input.projectId,
      title: input.title,
      description: input.description ?? null,
      createdBy: input.createdBy,
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
