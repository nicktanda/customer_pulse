import { and, count, eq } from "drizzle-orm";
import type { Database } from "@customer-pulse/db/client";
import { feedbacks, integrations, insights, ideas, projects, projectUsers } from "@customer-pulse/db/client";

export type ProjectPageData = {
  project: typeof projects.$inferSelect;
  isOwner: boolean;
  feedbackCount: number;
  integrationCount: number;
  insightCount: number;
  ideaCount: number;
};

/**
 * Shared loader for `/app/projects/[id]` and the projects list `?detail=` panel.
 */
export async function fetchProjectPageData(
  db: Database,
  userId: number,
  projectId: number,
): Promise<ProjectPageData | null> {
  const [proj] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!proj) {
    return null;
  }

  const [pu] = await db
    .select({ isOwner: projectUsers.isOwner })
    .from(projectUsers)
    .where(and(eq(projectUsers.projectId, projectId), eq(projectUsers.userId, userId)))
    .limit(1);

  if (!pu) {
    return null;
  }

  const [[fc], [ic], [insC], [ideaC]] = await Promise.all([
    db.select({ c: count() }).from(feedbacks).where(eq(feedbacks.projectId, projectId)),
    db.select({ c: count() }).from(integrations).where(eq(integrations.projectId, projectId)),
    db.select({ c: count() }).from(insights).where(eq(insights.projectId, projectId)),
    db.select({ c: count() }).from(ideas).where(eq(ideas.projectId, projectId)),
  ]);

  return {
    project: proj,
    isOwner: Boolean(pu.isOwner),
    feedbackCount: Number(fc?.c ?? 0),
    integrationCount: Number(ic?.c ?? 0),
    insightCount: Number(insC?.c ?? 0),
    ideaCount: Number(ideaC?.c ?? 0),
  };
}
