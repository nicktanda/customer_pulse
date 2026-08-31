"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { feedbacks, insights } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject, userHasProjectAccess } from "@/lib/project-access";
import { draftFromContext } from "@/lib/ai-drafts";

async function requireEditor(): Promise<{ userId: number; projectId: number }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = Number(session.user.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  if (projectId == null || !(await userHasProjectAccess(userId, projectId))) {
    redirect("/app/learn/insights");
  }
  if (!(await userCanEditProject(userId, projectId))) {
    redirect("/app/learn/insights");
  }
  return { userId, projectId };
}

/**
 * Item 7: drafts an insight title + description from selected feedback snippets.
 * Caller passes feedback IDs; action returns JSON for a client component to display + accept.
 */
export async function draftInsightFromFeedbackAction(feedbackIds: number[]): Promise<{
  ok: boolean;
  title?: string;
  description?: string;
  confidence?: number;
  suggestionId?: number | null;
  error?: string;
}> {
  const { projectId } = await requireEditor();
  const ids = feedbackIds.filter((n) => Number.isFinite(n) && n > 0).slice(0, 25);
  if (ids.length === 0) return { ok: false, error: "no_feedback" };

  const db = await getRequestDb();
  const rows = await db
    .select({ id: feedbacks.id, title: feedbacks.title, content: feedbacks.content })
    .from(feedbacks)
    .where(and(eq(feedbacks.projectId, projectId), inArray(feedbacks.id, ids)));

  if (rows.length === 0) return { ok: false, error: "not_found" };

  const context = rows
    .map((r) => `[feedback ${r.id}] ${r.title ? `${r.title}\n` : ""}${r.content.slice(0, 500)}`)
    .join("\n\n");

  const result = await draftFromContext<{ title: string; description: string }>({
    projectId,
    kind: "insight_draft",
    context,
  });

  if (!result) return { ok: false, error: "ai_unavailable" };
  return {
    ok: true,
    title: result.draft.title,
    description: result.draft.description,
    confidence: result.confidence,
    suggestionId: result.suggestionId,
  };
}

/**
 * Persists a manually-created insight, optionally linking it to seed feedback rows
 * via feedback_insights. Used by the "Create insight from selected feedback" flow.
 */
export async function createInsightAction(formData: FormData): Promise<void> {
  const { projectId } = await requireEditor();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!title || !description) {
    redirect("/app/learn/insights?error=invalid");
  }

  const db = await getRequestDb();
  const now = new Date();
  const [row] = await db
    .insert(insights)
    .values({
      projectId,
      title,
      description,
      insightType: 0,
      severity: 0,
      confidenceScore: 0,
      affectedUsersCount: 0,
      feedbackCount: 0,
      status: 0,
      evidence: [],
      metadata: {},
      discoveryStage: 1,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: insights.id });

  revalidatePath("/app/learn/insights");
  if (row?.id) {
    redirect(`/app/learn/insights/${row.id}`);
  }
  redirect("/app/learn/insights");
}

/**
 * Lightweight similarity probe — used by the "Looks similar to insight #N" warning on the
 * insight authoring flow so we don't accidentally create duplicate insights.
 */
export async function findSimilarInsightAction(title: string): Promise<{ id: number; title: string } | null> {
  const { projectId } = await requireEditor();
  if (title.trim().length < 4) return null;

  const tokens = title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4);
  if (tokens.length === 0) return null;

  const db = await getRequestDb();
  const candidates = await db
    .select({ id: insights.id, title: insights.title })
    .from(insights)
    .where(eq(insights.projectId, projectId))
    .orderBy(desc(insights.updatedAt))
    .limit(50);

  let best: { id: number; title: string; score: number } | null = null;
  for (const c of candidates) {
    const hay = c.title.toLowerCase();
    const score = tokens.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0);
    if (score > 0 && (!best || score > best.score)) best = { id: c.id, title: c.title, score };
  }
  return best ? { id: best.id, title: best.title } : null;
}
