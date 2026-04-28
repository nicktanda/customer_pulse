"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { projectSettings } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject } from "@/lib/project-access";

async function requireEditorProject() {
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
    redirect("/app/settings");
  }
  return { projectId };
}

/** Persists per-project general settings (pulse time, AI interval, etc.) */
export async function saveGeneralSettingsAction(formData: FormData): Promise<void> {
  const { projectId } = await requireEditorProject();

  const pulseSendTime = String(formData.get("pulse_send_time") ?? "09:00").trim();
  const aiProcessingIntervalHours = Number(formData.get("ai_processing_interval_hours") ?? 4);
  const defaultPriority = String(formData.get("default_priority") ?? "unset").trim();
  const autoArchiveDays = Number(formData.get("auto_archive_days") ?? 30);
  const githubAutoMerge = formData.get("github_auto_merge") === "on" || formData.get("github_auto_merge") === "true";

  const db = await getRequestDb();
  const now = new Date();

  const [existing] = await db
    .select({ id: projectSettings.id })
    .from(projectSettings)
    .where(eq(projectSettings.projectId, projectId))
    .limit(1);

  if (existing) {
    await db.update(projectSettings).set({
      pulseSendTime,
      aiProcessingIntervalHours: Number.isFinite(aiProcessingIntervalHours) ? aiProcessingIntervalHours : 4,
      defaultPriority,
      autoArchiveDays: Number.isFinite(autoArchiveDays) ? autoArchiveDays : 30,
      githubAutoMerge,
      updatedAt: now,
    }).where(eq(projectSettings.id, existing.id));
  } else {
    await db.insert(projectSettings).values({
      projectId,
      pulseSendTime,
      aiProcessingIntervalHours: Number.isFinite(aiProcessingIntervalHours) ? aiProcessingIntervalHours : 4,
      defaultPriority,
      autoArchiveDays: Number.isFinite(autoArchiveDays) ? autoArchiveDays : 30,
      githubAutoMerge,
      createdAt: now,
      updatedAt: now,
    });
  }

  revalidatePath("/app/settings");
  redirect("/app/settings?notice=settings");
}
