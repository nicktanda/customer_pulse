"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { feedbackTags, feedbacks, tags } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject, userHasProjectAccess } from "@/lib/project-access";
import { draftFromContext } from "@/lib/ai-drafts";

async function requireEditor(): Promise<{ userId: number; projectId: number }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = Number(session.user.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  if (projectId == null || !(await userHasProjectAccess(userId, projectId))) {
    redirect("/app/learn/feedback");
  }
  if (!(await userCanEditProject(userId, projectId))) {
    redirect("/app/learn/feedback");
  }
  return { userId, projectId };
}

export async function createTagAction(formData: FormData): Promise<void> {
  const { userId, projectId } = await requireEditor();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/app/learn/feedback?error=tag_name");
  const color = String(formData.get("color") ?? "").trim() || null;

  const db = await getRequestDb();
  const now = new Date();
  try {
    await db.insert(tags).values({
      projectId,
      name,
      color,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code !== "23505") throw e;
  }
  revalidatePath("/app/learn/feedback");
}

export async function applyTagAction(formData: FormData): Promise<void> {
  const { projectId } = await requireEditor();
  const feedbackId = Number(formData.get("feedback_id"));
  const tagId = Number(formData.get("tag_id"));
  if (!Number.isFinite(feedbackId) || !Number.isFinite(tagId)) return;

  const db = await getRequestDb();
  const [fb] = await db
    .select({ id: feedbacks.id })
    .from(feedbacks)
    .where(and(eq(feedbacks.id, feedbackId), eq(feedbacks.projectId, projectId)))
    .limit(1);
  if (!fb) return;

  const [tag] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.projectId, projectId)))
    .limit(1);
  if (!tag) return;

  await db
    .insert(feedbackTags)
    .values({ feedbackId, tagId, source: "human", createdAt: new Date() })
    .onConflictDoNothing();

  revalidatePath(`/app/learn/feedback/${feedbackId}`);
  revalidatePath("/app/learn/feedback");
}

/**
 * Cross-cut D: once enough human-tagged examples exist for a tag, propose tags for
 * unlabelled feedback. Returns proposals; nothing is persisted until the user accepts.
 *
 * Persists proposals to feedback_tags with source='ai' so we can render them as "pending"
 * tags and let the user accept individually. Confidence threshold is 0.7.
 */
export async function proposeTagsForFeedbackAction(): Promise<{
  ok: boolean;
  proposed?: number;
  error?: string;
}> {
  const { projectId } = await requireEditor();
  const db = await getRequestDb();

  // Need ≥ 3 human-tagged examples per tag to bootstrap pattern.
  const exRows = await db
    .select({
      tagId: tags.id,
      tagName: tags.name,
      feedbackId: feedbacks.id,
      content: feedbacks.content,
    })
    .from(tags)
    .innerJoin(feedbackTags, and(eq(feedbackTags.tagId, tags.id), eq(feedbackTags.source, "human")))
    .innerJoin(feedbacks, eq(feedbacks.id, feedbackTags.feedbackId))
    .where(eq(tags.projectId, projectId))
    .limit(60);

  // Group examples by tag — bail when no tag has ≥ 3 examples.
  const byTag = new Map<string, { tagId: number; samples: string[] }>();
  for (const row of exRows) {
    const e = byTag.get(row.tagName) ?? { tagId: row.tagId, samples: [] };
    if (e.samples.length < 3) e.samples.push(row.content.slice(0, 200));
    byTag.set(row.tagName, e);
  }
  const ready = [...byTag.entries()].filter(([, v]) => v.samples.length >= 3);
  if (ready.length === 0) return { ok: false, error: "need_more_examples" };

  // Pull untagged feedback to score against.
  const untagged = await db
    .select({ id: feedbacks.id, content: feedbacks.content })
    .from(feedbacks)
    .leftJoin(feedbackTags, eq(feedbackTags.feedbackId, feedbacks.id))
    .where(and(eq(feedbacks.projectId, projectId), isNull(feedbackTags.id)))
    .limit(40);

  if (untagged.length === 0) return { ok: true, proposed: 0 };

  const context = [
    "Existing tags with example feedback:",
    ...ready.map(
      ([name, v]) => `Tag "${name}":\n${v.samples.map((s, i) => `  example ${i + 1}: ${s}`).join("\n")}`,
    ),
    "",
    "Untagged feedback to classify:",
    ...untagged.map((f) => `[feedback ${f.id}]: ${f.content.slice(0, 300)}`),
  ].join("\n");

  const result = await draftFromContext<{
    tags: { feedbackId: number; tagName: string; confidence: number }[];
  }>({
    projectId,
    kind: "tag_propose",
    context,
    maxTokens: 2000,
  });

  if (!result) return { ok: false, error: "ai_unavailable" };

  const accepted = (result.draft.tags ?? []).filter((t) => t.confidence >= 0.7);
  if (accepted.length === 0) return { ok: true, proposed: 0 };

  const tagsByName = new Map<string, number>();
  for (const [name, v] of byTag.entries()) tagsByName.set(name.toLowerCase(), v.tagId);

  const feedbackIds = [...new Set(accepted.map((a) => a.feedbackId))];
  const validIds = feedbackIds.length
    ? await db
        .select({ id: feedbacks.id })
        .from(feedbacks)
        .where(and(eq(feedbacks.projectId, projectId), inArray(feedbacks.id, feedbackIds)))
    : [];
  const validIdSet = new Set(validIds.map((r) => r.id));

  const now = new Date();
  let proposedCount = 0;
  for (const a of accepted) {
    const tagId = tagsByName.get(a.tagName.toLowerCase());
    if (!tagId) continue;
    if (!validIdSet.has(a.feedbackId)) continue;
    try {
      await db
        .insert(feedbackTags)
        .values({
          feedbackId: a.feedbackId,
          tagId,
          source: "ai",
          confidence: a.confidence,
          createdAt: now,
        })
        .onConflictDoNothing();
      proposedCount++;
    } catch {
      /* duplicate or constraint — keep counting */
    }
  }
  revalidatePath("/app/learn/feedback");
  return { ok: true, proposed: proposedCount };
}
