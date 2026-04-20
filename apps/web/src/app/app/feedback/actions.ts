"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { Queue } from "bullmq";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { feedbacks } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject } from "@/lib/project-access";
import { getRedis } from "@/lib/redis";
import { QUEUE_DEFAULT } from "@/lib/queue-names";

/**
 * Optional hidden field from the list-page panel: return to `/app/feedback?...` after save
 * (same-origin only — rejects odd paths so we never open-redirect).
 */
function parseSafeListReturnPath(raw: FormDataEntryValue | null): string | null {
  if (raw == null || typeof raw !== "string") {
    return null;
  }
  const s = raw.trim();
  if (s.length === 0 || s.length > 2048) {
    return null;
  }
  if (s.includes("\n") || s.includes("\r")) {
    return null;
  }
  if (!s.startsWith("/app/feedback")) {
    return null;
  }
  const q = s.indexOf("?");
  const path = q === -1 ? s : s.slice(0, q);
  if (path !== "/app/feedback") {
    return null;
  }
  return s;
}

function withQueryParam(path: string, key: string, value: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

async function requireEditorAndProject(): Promise<{ userId: number; projectId: number }> {
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
    redirect("/app/feedback");
  }
  return { userId, projectId };
}

async function loadFeedbackInProject(projectId: number, feedbackId: number) {
  const db = await getRequestDb();
  const [row] = await db
    .select()
    .from(feedbacks)
    .where(and(eq(feedbacks.id, feedbackId), eq(feedbacks.projectId, projectId)))
    .limit(1);
  return row;
}

export async function updateFeedbackAction(feedbackId: number, formData: FormData): Promise<void> {
  const { projectId } = await requireEditorAndProject();
  const row = await loadFeedbackInProject(projectId, feedbackId);
  if (!row) {
    redirect("/app/feedback");
  }

  const status = Number(formData.get("status"));
  const priority = Number(formData.get("priority"));
  const category = Number(formData.get("category"));
  const manuallyReviewed =
    formData.get("manually_reviewed") === "true" || formData.get("manually_reviewed") === "on";

  const db = await getRequestDb();
  const now = new Date();
  await db
    .update(feedbacks)
    .set({
      status: Number.isFinite(status) ? status : row.status,
      priority: Number.isFinite(priority) ? priority : row.priority,
      category: Number.isFinite(category) ? category : row.category,
      manuallyReviewed,
      updatedAt: now,
    })
    .where(eq(feedbacks.id, feedbackId));

  revalidatePath("/app/feedback");
  revalidatePath(`/app/feedback/${feedbackId}`);
  const back = parseSafeListReturnPath(formData.get("return_path"));
  redirect(back ?? `/app/feedback/${feedbackId}`);
}

export async function reprocessFeedbackAction(feedbackId: number, _formData?: FormData): Promise<void> {
  const { projectId } = await requireEditorAndProject();
  const row = await loadFeedbackInProject(projectId, feedbackId);
  if (!row) {
    redirect("/app/feedback");
  }

  try {
    const q = new Queue(QUEUE_DEFAULT, { connection: getRedis() });
    await q.add("process_feedback", { feedbackId: row.id }, { removeOnComplete: 1000, removeOnFail: 5000 });
  } catch {
    // Redis optional in local dev
  }

  revalidatePath(`/app/feedback/${feedbackId}`);
  const back = parseSafeListReturnPath(_formData?.get("return_path") ?? null);
  const target = back ?? `/app/feedback/${feedbackId}`;
  redirect(withQueryParam(target, "notice", "reprocess"));
}

export async function bulkUpdateFeedbackAction(formData: FormData): Promise<void> {
  const { projectId } = await requireEditorAndProject();
  const rawIds = formData.getAll("feedback_ids").map(String);
  const ids = rawIds.map((x) => Number.parseInt(x, 10)).filter((n) => Number.isFinite(n) && n > 0);
  if (ids.length === 0) {
    redirect("/app/feedback?error=bulk");
  }

  const patch: {
    status?: number;
    priority?: number;
    category?: number;
    updatedAt: Date;
  } = { updatedAt: new Date() };
  const statusRaw = formData.get("bulk_status");
  if (statusRaw != null && String(statusRaw) !== "") {
    patch.status = Number(statusRaw);
  }
  const priorityRaw = formData.get("bulk_priority");
  if (priorityRaw != null && String(priorityRaw) !== "") {
    patch.priority = Number(priorityRaw);
  }
  const categoryRaw = formData.get("bulk_category");
  if (categoryRaw != null && String(categoryRaw) !== "") {
    patch.category = Number(categoryRaw);
  }

  if (patch.status === undefined && patch.priority === undefined && patch.category === undefined) {
    redirect("/app/feedback?error=bulk");
  }

  const db = await getRequestDb();
  await db
    .update(feedbacks)
    .set(patch)
    .where(and(eq(feedbacks.projectId, projectId), inArray(feedbacks.id, ids)));

  revalidatePath("/app/feedback");
  redirect("/app/feedback?notice=bulk");
}
