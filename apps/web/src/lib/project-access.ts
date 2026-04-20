import { eq, and } from "drizzle-orm";
import type { Database } from "@customer-pulse/db/client";
import { getRequestDb } from "@/lib/db";
import { projectUsers } from "@customer-pulse/db/client";

export type ProjectMembership = {
  projectId: number;
  isOwner: boolean;
};

/**
 * Loads membership for this user + project, or null if they are not on the project.
 * Represents the signed-in user's membership row for a project (role + ids).
 */
export async function getProjectMembership(
  userId: number,
  projectId: number,
  db?: Database,
): Promise<ProjectMembership | null> {
  const resolved = db ?? (await getRequestDb());
  const [row] = await resolved
    .select({
      projectId: projectUsers.projectId,
      isOwner: projectUsers.isOwner,
    })
    .from(projectUsers)
    .where(and(eq(projectUsers.userId, userId), eq(projectUsers.projectId, projectId)))
    .limit(1);
  return row ?? null;
}

export async function userHasProjectAccess(userId: number, projectId: number, db?: Database): Promise<boolean> {
  const m = await getProjectMembership(userId, projectId, db);
  return m != null;
}

export async function userIsProjectOwner(userId: number, projectId: number, db?: Database): Promise<boolean> {
  const m = await getProjectMembership(userId, projectId, db);
  return m?.isOwner === true;
}

/**
 * After roles were removed from `project_users`, any member can edit integrations, feedback, etc.
 * Named `requireProjectEditor` to match how we gate "can edit project content" across routes.
 */
export async function userCanEditProject(userId: number, projectId: number, db?: Database): Promise<boolean> {
  return userHasProjectAccess(userId, projectId, db);
}
