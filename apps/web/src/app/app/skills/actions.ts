"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { skills } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject } from "@/lib/project-access";

async function requireEditor() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = Number(session.user.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  if (projectId == null) {
    redirect("/app/projects");
  }
  if (!(await userCanEditProject(userId, projectId))) {
    redirect("/app/skills");
  }
  return { userId, projectId };
}

export async function createSkillAction(formData: FormData): Promise<void> {
  const { userId, projectId } = await requireEditor();
  const name = String(formData.get("name") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const content = String(formData.get("content") ?? "").trim();

  if (!name || !title || !content) {
    redirect("/app/skills/new?error=required");
  }

  const now = new Date();
  const db = getDb();
  try {
    await db.insert(skills).values({
      name,
      title,
      description,
      content,
      userId,
      projectId,
      createdAt: now,
      updatedAt: now,
    });
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "23505") {
      redirect("/app/skills/new?error=dup");
    }
    throw e;
  }
  revalidatePath("/app/skills");
  redirect("/app/skills");
}

export async function updateSkillAction(skillId: number, formData: FormData): Promise<void> {
  const { projectId } = await requireEditor();
  const db = getDb();
  const [row] = await db
    .select()
    .from(skills)
    .where(and(eq(skills.id, skillId), eq(skills.projectId, projectId)))
    .limit(1);
  if (!row) {
    redirect("/app/skills");
  }

  const name = String(formData.get("name") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const content = String(formData.get("content") ?? "").trim();

  if (!name || !title || !content) {
    redirect(`/app/skills/${skillId}/edit?error=required`);
  }

  try {
    await db
      .update(skills)
      .set({ name, title, description, content, updatedAt: new Date() })
      .where(eq(skills.id, skillId));
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "23505") {
      redirect(`/app/skills/${skillId}/edit?error=dup`);
    }
    throw e;
  }

  revalidatePath("/app/skills");
  redirect("/app/skills");
}

export async function deleteSkillAction(skillId: number, _formData?: FormData): Promise<void> {
  const { projectId } = await requireEditor();
  const db = getDb();
  const [row] = await db
    .select()
    .from(skills)
    .where(and(eq(skills.id, skillId), eq(skills.projectId, projectId)))
    .limit(1);
  if (!row) {
    redirect("/app/skills");
  }
  await db.delete(skills).where(eq(skills.id, skillId));
  revalidatePath("/app/skills");
  redirect("/app/skills");
}
