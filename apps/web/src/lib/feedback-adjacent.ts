import { and, asc, desc, eq, gt, lt, or } from "drizzle-orm";
import type { Database } from "@customer-pulse/db/client";
import { feedbacks } from "@customer-pulse/db/client";

/**
 * Neighbors use the same order as the main feedback list: newest first (`createdAt` desc, then `id` desc).
 * “Previous” = one step toward newer items; “Next” = one step toward older items.
 */
export async function getAdjacentFeedbackIds(
  db: Database,
  projectId: number,
  row: { id: number; createdAt: Date },
): Promise<{ newerId: number | null; olderId: number | null }> {
  const [newerRow] = await db
    .select({ id: feedbacks.id })
    .from(feedbacks)
    .where(
      and(
        eq(feedbacks.projectId, projectId),
        or(
          gt(feedbacks.createdAt, row.createdAt),
          and(eq(feedbacks.createdAt, row.createdAt), gt(feedbacks.id, row.id)),
        ),
      ),
    )
    .orderBy(asc(feedbacks.createdAt), asc(feedbacks.id))
    .limit(1);

  const [olderRow] = await db
    .select({ id: feedbacks.id })
    .from(feedbacks)
    .where(
      and(
        eq(feedbacks.projectId, projectId),
        or(
          lt(feedbacks.createdAt, row.createdAt),
          and(eq(feedbacks.createdAt, row.createdAt), lt(feedbacks.id, row.id)),
        ),
      ),
    )
    .orderBy(desc(feedbacks.createdAt), desc(feedbacks.id))
    .limit(1);

  return { newerId: newerRow?.id ?? null, olderId: olderRow?.id ?? null };
}
