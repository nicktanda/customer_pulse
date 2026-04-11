import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { projectUsers } from "@customer-pulse/db/client";

export type ProjectMembership = {
  projectId: number;
  isOwner: boolean;
};

/**
 * Loads membership for this user + project, or null if they are not on the project.
 * Represents the signed-in user’s membership row for a project (role + ids).
 */
export async function getProjectMembership(
  userId: number,
  projectId: number,
): Promise<ProjectMembership | null> {
  const db = getDb();
  const [row] = await db
    .select({
      projectId: projectUsers.projectId,
      isOwner: projectUsers.isOwner,
    })
    .from(projectUsers)
    .where(and(eq(projectUsers.userId, userId), eq(projectUsers.projectId, projectId)))
    .limit(1);
  return row ?? null;
}

/** True if the user is a member of the project. */
export async function userHasProjectAccess(userId: number, projectId: number): Promise<boolean> {
  const m = await getProjectMembership(userId, projectId);
  return m != null;
}

/** True if the user owns the project (can manage members / destructive actions). */
export async function userIsProjectOwner(userId: number, projectId: number): Promise<boolean> {
  const m = await getProjectMembership(userId, projectId);
  return m?.isOwner === true;
}

/**
 * After roles were removed from `project_users`, any member can edit integrations, feedback, etc.
 * Named `requireProjectEditor` to match how we gate “can edit project content” across routes.
 */
export async function userCanEditProject(userId: number, projectId: number): Promise<boolean> {
  return userHasProjectAccess(userId, projectId);
}
