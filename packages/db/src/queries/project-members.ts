/**
 * Project membership rows for pickers (assignments, sharing, etc.).
 */

import { eq, asc } from "drizzle-orm";
import type { Database } from "../client";
import { projectUsers, users } from "../schema";

export type ProjectMemberUserRow = {
  id: number;
  email: string;
  name: string | null;
};

/**
 * All users who belong to a project — for assignee / discovery lead dropdowns.
 */
export async function listProjectMemberUsersForAssignment(
  db: Database,
  projectId: number,
): Promise<ProjectMemberUserRow[]> {
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(projectUsers)
    .innerJoin(users, eq(projectUsers.userId, users.id))
    .where(eq(projectUsers.projectId, projectId))
    .orderBy(asc(users.email));
}
