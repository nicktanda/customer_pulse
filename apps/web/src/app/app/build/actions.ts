"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject } from "@/lib/project-access";
import {
  createSpec,
  linkSpecToInsights,
} from "@customer-pulse/db/queries/specs";

/**
 * Verifies the user is signed in, has an active project, and can edit it.
 * Returns userId + projectId so callers don't repeat the same auth dance.
 */
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
    redirect("/app/build/specs");
  }
  return { userId, projectId };
}

/**
 * Server action: creates a new spec row and links it to any selected insights.
 *
 * Form fields expected:
 *   title        (required)
 *   description  (optional)
 *   insight_ids  (optional, can be a repeated field — one value per selected insight)
 *
 * On success: redirects to /app/build/specs/[newId].
 * On validation failure: redirects back to the form with an error query param.
 */
export async function createSpecAction(formData: FormData): Promise<void> {
  const { userId, projectId } = await requireEditor();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!title) {
    redirect("/app/build/specs/new?error=required");
  }

  // insight_ids can be sent as a repeated field (one <input name="insight_ids"> per selection)
  const rawIds = formData.getAll("insight_ids");
  const insightIds = rawIds
    .map((v) => Number.parseInt(String(v), 10))
    .filter((n) => Number.isFinite(n) && n > 0);

  const db = await getRequestDb();

  const newId = await createSpec(db, { projectId, title, description, createdBy: userId });

  await linkSpecToInsights(db, newId, insightIds);

  revalidatePath("/app/build/specs");
  redirect(`/app/build/specs/${newId}`);
}
