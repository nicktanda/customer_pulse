/**
 * Drizzle query helpers for the `discovery_activities` table.
 *
 * All functions accept a `db` instance rather than creating their own connection,
 * matching the pattern used in queries/specs.ts and across the codebase.
 */

import { eq, desc, and, sql } from "drizzle-orm";
import type { Database } from "../client";
import { discoveryActivities, insights } from "../schema";

// ─── Types ───────────────────────────────────────────────────────────────────

/** A single row returned by getActivitiesByInsight — everything the activity list needs. */
export type ActivityListRow = {
  id: number;
  title: string;
  activityType: number;
  status: number;
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** The full activity row for the detail page. */
export type ActivityDetailRow = {
  id: number;
  insightId: number;
  projectId: number;
  title: string;
  activityType: number;
  status: number;
  aiGeneratedContent: Record<string, unknown> | null;
  findings: string | null;
  aiGenerated: boolean;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * A summary of an insight plus the count of its discovery activities,
 * used on the /app/discover/insights list page.
 */
export type InsightDiscoverySummaryRow = {
  insightId: number;
  insightTitle: string;
  activityCount: number;
  completeCount: number;
};

/** Input for createDiscoveryActivity. */
export type CreateDiscoveryActivityInput = {
  projectId: number;
  insightId: number;
  activityType: number;
  title: string;
  createdBy: number;
};

/** Input for updating an activity's findings and/or status. */
export type UpdateDiscoveryActivityInput = {
  findings?: string | null;
  status?: number;
  aiGeneratedContent?: Record<string, unknown> | null;
  aiGenerated?: boolean;
};

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Returns all activities for a specific insight, newest first.
 */
export async function getActivitiesByInsight(
  db: Database,
  insightId: number,
  projectId: number,
): Promise<ActivityListRow[]> {
  return db
    .select({
      id: discoveryActivities.id,
      title: discoveryActivities.title,
      activityType: discoveryActivities.activityType,
      status: discoveryActivities.status,
      aiGenerated: discoveryActivities.aiGenerated,
      createdAt: discoveryActivities.createdAt,
      updatedAt: discoveryActivities.updatedAt,
    })
    .from(discoveryActivities)
    .where(
      and(
        eq(discoveryActivities.insightId, insightId),
        eq(discoveryActivities.projectId, projectId),
      ),
    )
    .orderBy(desc(discoveryActivities.createdAt));
}

/**
 * Returns the full detail row for a single activity.
 */
export async function getActivityById(
  db: Database,
  activityId: number,
  projectId: number,
): Promise<ActivityDetailRow | null> {
  const [row] = await db
    .select()
    .from(discoveryActivities)
    .where(
      and(
        eq(discoveryActivities.id, activityId),
        eq(discoveryActivities.projectId, projectId),
      ),
    )
    .limit(1);

  return row ?? null;
}

/**
 * Returns all insights for a project that have at least one discovery activity,
 * with counts. Used on the /app/discover/insights list page.
 */
export async function getInsightsWithDiscovery(
  db: Database,
  projectId: number,
): Promise<InsightDiscoverySummaryRow[]> {
  /*
   * Join insights → discovery_activities, group by insight, return counts.
   * status=3 is DiscoveryActivityStatus.complete.
   */
  const rows = await db
    .select({
      insightId: insights.id,
      insightTitle: insights.title,
      activityCount: sql<number>`count(*)::int`,
      completeCount: sql<number>`count(*) filter (where ${discoveryActivities.status} = 3)::int`,
    })
    .from(discoveryActivities)
    .innerJoin(insights, eq(discoveryActivities.insightId, insights.id))
    .where(
      and(
        eq(discoveryActivities.projectId, projectId),
        eq(insights.projectId, projectId),
      ),
    )
    .groupBy(insights.id, insights.title)
    .orderBy(desc(sql`count(*)`));

  return rows;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Inserts a new discovery activity row and returns the new id.
 * Status defaults to 1 (draft).
 */
export async function createDiscoveryActivity(
  db: Database,
  input: CreateDiscoveryActivityInput,
): Promise<number> {
  const now = new Date();
  const [row] = await db
    .insert(discoveryActivities)
    .values({
      projectId: input.projectId,
      insightId: input.insightId,
      activityType: input.activityType,
      title: input.title,
      status: 1, // draft
      aiGenerated: false,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: discoveryActivities.id });

  if (!row) {
    throw new Error("createDiscoveryActivity: insert did not return a row");
  }

  return row.id;
}

/**
 * Updates an activity's findings, status, or AI-generated content.
 * Only the fields present in `input` are written.
 */
export async function updateDiscoveryActivity(
  db: Database,
  activityId: number,
  projectId: number,
  input: UpdateDiscoveryActivityInput,
): Promise<void> {
  const updates: Partial<typeof discoveryActivities.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.findings !== undefined) updates.findings = input.findings;
  if (input.status !== undefined) updates.status = input.status;
  if (input.aiGeneratedContent !== undefined) updates.aiGeneratedContent = input.aiGeneratedContent ?? undefined;
  if (input.aiGenerated !== undefined) updates.aiGenerated = input.aiGenerated;

  await db
    .update(discoveryActivities)
    .set(updates)
    .where(
      and(
        eq(discoveryActivities.id, activityId),
        eq(discoveryActivities.projectId, projectId),
      ),
    );
}
