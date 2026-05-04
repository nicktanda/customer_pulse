"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { projects, projectUsers, projectInvitations, users } from "@customer-pulse/db/client";
import { userIsProjectOwner } from "@/lib/project-access";
import { slugifyName } from "./slug";

async function requireUserId(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return Number(session.user.id);
}

export async function updateProjectAction(projectId: number, formData: FormData): Promise<void> {
  const userId = await requireUserId();
  if (!(await userIsProjectOwner(userId, projectId))) {
    redirect("/app/projects");
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!name) {
    redirect(`/app/projects/${projectId}/edit?error=name`);
  }

  const db = await getRequestDb();
  const now = new Date();
  let slug = slugifyName(name);
  const [conflict] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.slug, slug), ne(projects.id, projectId)))
    .limit(1);
  if (conflict) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  await db
    .update(projects)
    .set({ name, description, slug, updatedAt: now })
    .where(eq(projects.id, projectId));

  revalidatePath("/app/projects");
  revalidatePath(`/app/projects/${projectId}`);
  redirect(`/app/projects/${projectId}`);
}

export async function addProjectMemberAction(projectId: number, formData: FormData): Promise<void> {
  const userId = await requireUserId();
  if (!(await userIsProjectOwner(userId, projectId))) {
    redirect(`/app/projects/${projectId}/members`);
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) {
    redirect(`/app/projects/${projectId}/members?error=email`);
  }

  const db = await getRequestDb();
  const [target] = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);

  const now = new Date();

  if (target) {
    // Existing user — add directly
    const [dup] = await db
      .select()
      .from(projectUsers)
      .where(and(eq(projectUsers.projectId, projectId), eq(projectUsers.userId, target.id)))
      .limit(1);
    if (dup) {
      redirect(`/app/projects/${projectId}/members?error=dup`);
    }

    await db.insert(projectUsers).values({
      projectId,
      userId: target.id,
      invitedById: userId,
      isOwner: false,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    // User doesn't exist yet — create pending invitation
    const [existingInvite] = await db
      .select()
      .from(projectInvitations)
      .where(and(eq(projectInvitations.projectId, projectId), eq(projectInvitations.email, email)))
      .limit(1);
    if (existingInvite) {
      redirect(`/app/projects/${projectId}/members?error=dup_invite`);
    }

    await db.insert(projectInvitations).values({
      projectId,
      email,
      invitedById: userId,
      createdAt: now,
      updatedAt: now,
    });
  }

  revalidatePath(`/app/projects/${projectId}/members`);
  redirect(`/app/projects/${projectId}/members`);
}

export async function cancelInvitationAction(
  projectId: number,
  invitationId: number,
  _formData?: FormData,
): Promise<void> {
  const userId = await requireUserId();
  if (!(await userIsProjectOwner(userId, projectId))) {
    redirect(`/app/projects/${projectId}/members`);
  }

  const db = await getRequestDb();
  await db
    .delete(projectInvitations)
    .where(and(eq(projectInvitations.id, invitationId), eq(projectInvitations.projectId, projectId)));

  revalidatePath(`/app/projects/${projectId}/members`);
  redirect(`/app/projects/${projectId}/members`);
}

export async function removeProjectMemberAction(
  projectId: number,
  projectUserId: number,
  _formData?: FormData,
): Promise<void> {
  const userId = await requireUserId();
  if (!(await userIsProjectOwner(userId, projectId))) {
    redirect(`/app/projects/${projectId}/members`);
  }

  const db = await getRequestDb();
  const [row] = await db
    .select()
    .from(projectUsers)
    .where(and(eq(projectUsers.id, projectUserId), eq(projectUsers.projectId, projectId)))
    .limit(1);
  if (!row || row.isOwner) {
    redirect(`/app/projects/${projectId}/members?error=remove`);
  }

  await db.delete(projectUsers).where(eq(projectUsers.id, projectUserId));

  revalidatePath(`/app/projects/${projectId}/members`);
  redirect(`/app/projects/${projectId}/members`);
}
