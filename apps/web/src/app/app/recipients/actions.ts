"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { emailRecipients } from "@customer-pulse/db/client";
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
    redirect("/app/recipients");
  }
  return { projectId };
}

export async function createRecipientAction(formData: FormData): Promise<void> {
  const { projectId } = await requireEditor();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim() || null;
  if (!email) {
    redirect("/app/recipients/new?error=email");
  }
  const now = new Date();
  const db = await getRequestDb();
  try {
    await db.insert(emailRecipients).values({
      projectId,
      email,
      name,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "23505") {
      redirect("/app/recipients/new?error=dup");
    }
    throw e;
  }
  revalidatePath("/app/recipients");
  redirect("/app/recipients");
}

export async function updateRecipientAction(recipientId: number, formData: FormData): Promise<void> {
  const { projectId } = await requireEditor();
  const db = await getRequestDb();
  const [row] = await db
    .select()
    .from(emailRecipients)
    .where(and(eq(emailRecipients.id, recipientId), eq(emailRecipients.projectId, projectId)))
    .limit(1);
  if (!row) {
    redirect("/app/recipients");
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim() || null;
  const active = formData.get("active") === "on" || formData.get("active") === "true";
  if (!email) {
    redirect(`/app/recipients/${recipientId}/edit?error=email`);
  }

  await db
    .update(emailRecipients)
    .set({ email, name, active, updatedAt: new Date() })
    .where(eq(emailRecipients.id, recipientId));

  revalidatePath("/app/recipients");
  redirect("/app/recipients");
}

/**
 * Item 10: per-recipient digest filters + tone preferences.
 *
 * Filters are enforced in worker SQL (NOT trusted to the LLM) — see
 * apps/worker/src/reporting-nl.ts buildReportingContextBundle. Preferences are passed into
 * the digest prompt so each recipient gets a tailored summary.
 */
export async function updateRecipientFiltersAction(
  recipientId: number,
  formData: FormData,
): Promise<void> {
  const { projectId } = await requireEditor();
  const db = await getRequestDb();
  const [row] = await db
    .select({ id: emailRecipients.id })
    .from(emailRecipients)
    .where(and(eq(emailRecipients.id, recipientId), eq(emailRecipients.projectId, projectId)))
    .limit(1);
  if (!row) redirect("/app/recipients");

  const minPriorityRaw = formData.get("min_priority");
  const minPriority =
    typeof minPriorityRaw === "string" && minPriorityRaw !== ""
      ? Number.parseInt(minPriorityRaw, 10)
      : null;

  const categoriesRaw = formData.getAll("categories");
  const categories = categoriesRaw
    .map((v) => Number.parseInt(String(v), 10))
    .filter((n) => Number.isFinite(n));

  const tone = String(formData.get("tone") ?? "").trim() || null;
  const focus = String(formData.get("focus") ?? "").trim() || null;

  const filters: Record<string, unknown> = {};
  if (minPriority != null && Number.isFinite(minPriority)) filters.minPriority = minPriority;
  if (categories.length > 0) filters.categories = categories;

  const preferences: Record<string, unknown> = {};
  if (tone) preferences.tone = tone;
  if (focus) preferences.focus = focus;

  await db
    .update(emailRecipients)
    .set({ filters, preferences, updatedAt: new Date() })
    .where(eq(emailRecipients.id, recipientId));

  revalidatePath("/app/recipients");
  revalidatePath(`/app/recipients/${recipientId}/edit`);
  redirect(`/app/recipients/${recipientId}/edit?notice=filters`);
}

export async function deleteRecipientAction(recipientId: number, _formData?: FormData): Promise<void> {
  const { projectId } = await requireEditor();
  const db = await getRequestDb();
  const [row] = await db
    .select()
    .from(emailRecipients)
    .where(and(eq(emailRecipients.id, recipientId), eq(emailRecipients.projectId, projectId)))
    .limit(1);
  if (!row) {
    redirect("/app/recipients");
  }
  await db.delete(emailRecipients).where(eq(emailRecipients.id, recipientId));
  revalidatePath("/app/recipients");
  redirect("/app/recipients");
}
