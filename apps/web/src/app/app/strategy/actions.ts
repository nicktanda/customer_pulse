"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { projects, teams } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject, userHasProjectAccess } from "@/lib/project-access";

/** Shared guard: must be logged in and on a project you belong to. */
async function requireMember() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = Number(session.user.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  if (projectId == null || !(await userHasProjectAccess(userId, projectId))) {
    redirect("/app/strategy");
  }
  return { userId, projectId };
}

/** Mutations only if you can edit the project (any member today — see project-access). */
async function requireEditor() {
  const ctx = await requireMember();
  if (!(await userCanEditProject(ctx.userId, ctx.projectId))) {
    redirect("/app/strategy");
  }
  return ctx;
}

const businessSchema = z.object({
  businessObjectives: z.string().max(50_000).optional(),
  businessStrategy: z.string().max(50_000).optional(),
});

/**
 * Saves the top-level “business” objectives and strategy on the current project row.
 * These are plain text fields — no structured OKR schema in v1.
 */
export async function updateBusinessStrategyAction(formData: FormData): Promise<void> {
  const { projectId } = await requireEditor();
  const parsed = businessSchema.safeParse({
    businessObjectives: formData.get("business_objectives")?.toString() ?? "",
    businessStrategy: formData.get("business_strategy")?.toString() ?? "",
  });
  if (!parsed.success) {
    redirect("/app/strategy?error=invalid");
  }
  const now = new Date();
  const db = getDb();
  await db
    .update(projects)
    .set({
      businessObjectives: parsed.data.businessObjectives || null,
      businessStrategy: parsed.data.businessStrategy || null,
      updatedAt: now,
    })
    .where(eq(projects.id, projectId));
  revalidatePath("/app/strategy");
  redirect("/app/strategy?notice=saved");
}

const teamCreateSchema = z.object({
  name: z.string().trim().min(1).max(255),
  objectives: z.string().max(50_000).optional(),
  strategy: z.string().max(50_000).optional(),
});

export async function createTeamAction(formData: FormData): Promise<void> {
  const { projectId } = await requireEditor();
  const parsed = teamCreateSchema.safeParse({
    name: formData.get("name")?.toString() ?? "",
    objectives: formData.get("objectives")?.toString() ?? "",
    strategy: formData.get("strategy")?.toString() ?? "",
  });
  if (!parsed.success) {
    redirect("/app/strategy?error=team_invalid");
  }
  const now = new Date();
  const db = getDb();
  await db.insert(teams).values({
    projectId,
    name: parsed.data.name,
    objectives: parsed.data.objectives || null,
    strategy: parsed.data.strategy || null,
    createdAt: now,
    updatedAt: now,
  });
  revalidatePath("/app/strategy");
  redirect("/app/strategy?notice=team_created");
}

const teamUpdateSchema = teamCreateSchema.extend({
  id: z.coerce.number().int().positive(),
});

export async function updateTeamAction(formData: FormData): Promise<void> {
  const { projectId } = await requireEditor();
  const parsed = teamUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name")?.toString() ?? "",
    objectives: formData.get("objectives")?.toString() ?? "",
    strategy: formData.get("strategy")?.toString() ?? "",
  });
  if (!parsed.success) {
    redirect("/app/strategy?error=team_invalid");
  }
  const now = new Date();
  const db = getDb();
  const [row] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.id, parsed.data.id), eq(teams.projectId, projectId)))
    .limit(1);
  if (!row) {
    redirect("/app/strategy?error=team_not_found");
  }
  await db
    .update(teams)
    .set({
      name: parsed.data.name,
      objectives: parsed.data.objectives || null,
      strategy: parsed.data.strategy || null,
      updatedAt: now,
    })
    .where(eq(teams.id, parsed.data.id));
  revalidatePath("/app/strategy");
  redirect("/app/strategy?notice=team_updated");
}

export async function deleteTeamAction(formData: FormData): Promise<void> {
  const { projectId } = await requireEditor();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) {
    redirect("/app/strategy?error=team_invalid");
  }
  const db = getDb();
  await db.delete(teams).where(and(eq(teams.id, id), eq(teams.projectId, projectId)));
  revalidatePath("/app/strategy");
  redirect("/app/strategy?notice=team_deleted");
}
