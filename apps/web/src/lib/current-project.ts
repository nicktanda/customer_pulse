import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import type { Database } from "@customer-pulse/db/client";
import { getRequestDb } from "@/lib/db";
import { projectUsers, projects } from "@customer-pulse/db/client";
import type { UserProjectRow } from "@/lib/project-types";

/** Cookie stores the active project id for this browser session (httpOnly, server-only). */
export const CURRENT_PROJECT_COOKIE = "current_project_id";

export type { UserProjectRow };

/**
 * All projects the user belongs to within the current tenant DB.
 */
export async function listUserProjects(userId: number, db?: Database): Promise<UserProjectRow[]> {
  const resolved = db ?? (await getRequestDb());
  return resolved
    .select({
      projectId: projectUsers.projectId,
      name: projects.name,
      slug: projects.slug,
      isOwner: projectUsers.isOwner,
    })
    .from(projectUsers)
    .innerJoin(projects, eq(projectUsers.projectId, projects.id))
    .where(eq(projectUsers.userId, userId));
}

/**
 * Reads the cookie value (may be missing or invalid — callers validate against memberships).
 */
export async function readCurrentProjectCookie(): Promise<number | null> {
  const raw = (await cookies()).get(CURRENT_PROJECT_COOKIE)?.value;
  if (raw == null || raw === "") {
    return null;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Ensures the browser has a valid current-project cookie when the user has at least one project.
 * If the cookie is missing or not in the membership list, redirects through `/app/set-project`.
 */
export async function ensureCurrentProjectCookie(userId: number, db?: Database): Promise<void> {
  const rows = await listUserProjects(userId, db);
  if (rows.length === 0) {
    return;
  }
  const allowed = new Set(rows.map((r) => r.projectId));
  const fromCookie = await readCurrentProjectCookie();
  if (fromCookie != null && allowed.has(fromCookie)) {
    return;
  }
  redirect(`/app/set-project?id=${rows[0]!.projectId}`);
}

/**
 * Returns the current project id after cookie validation, or null if the user has no projects.
 */
export async function getCurrentProjectIdForUser(userId: number, db?: Database): Promise<number | null> {
  const rows = await listUserProjects(userId, db);
  if (rows.length === 0) {
    return null;
  }
  const allowed = new Set(rows.map((r) => r.projectId));
  const fromCookie = await readCurrentProjectCookie();
  if (fromCookie != null && allowed.has(fromCookie)) {
    return fromCookie;
  }
  return rows[0]!.projectId;
}

/** Name + slug for page subtitles (current cookie project). */
export async function getCurrentProjectSummaryForUser(
  userId: number,
  db?: Database,
): Promise<{ id: number; name: string; slug: string } | null> {
  const resolved = db ?? (await getRequestDb());
  const projectId = await getCurrentProjectIdForUser(userId, resolved);
  if (projectId == null) {
    return null;
  }
  const [row] = await resolved
    .select({ id: projects.id, name: projects.name, slug: projects.slug })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  return row ?? null;
}
