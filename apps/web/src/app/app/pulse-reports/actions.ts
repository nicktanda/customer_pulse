"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import {
  integrations,
  ideaPullRequests,
  pulseReports,
  IntegrationSourceType,
} from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject, userHasProjectAccess } from "@/lib/project-access";
import { Queue } from "bullmq";
import { getRedis } from "@/lib/redis";
import { QUEUE_DEFAULT, QUEUE_MAILERS } from "@/lib/queue-names";

async function requireMember() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = Number(session.user.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  if (projectId == null || !(await userHasProjectAccess(userId, projectId))) {
    redirect("/app/pulse-reports");
  }
  return { userId, projectId };
}

async function requireEditor() {
  const ctx = await requireMember();
  if (!(await userCanEditProject(ctx.userId, ctx.projectId))) {
    redirect("/app/pulse-reports");
  }
  return ctx;
}

/** Enqueues the daily pulse mailer job for the current project (worker `mailers` queue). */
export async function enqueueSendDailyPulseAction(_formData?: FormData): Promise<void> {
  const { projectId } = await requireEditor();
  try {
    const q = new Queue(QUEUE_MAILERS, { connection: getRedis() });
    await q.add("SendDailyPulseJob", { projectId }, { removeOnComplete: 200, removeOnFail: 500 });
  } catch {
    // Redis optional
  }
  revalidatePath("/app/pulse-reports");
  redirect("/app/pulse-reports?notice=pulse");
}

/** Re-sends an already-sent report. */
export async function resendPulseReportAction(reportId: number, _formData?: FormData): Promise<void> {
  const { projectId } = await requireEditor();
  const db = getDb();
  const [row] = await db
    .select()
    .from(pulseReports)
    .where(and(eq(pulseReports.id, reportId), eq(pulseReports.projectId, projectId)))
    .limit(1);
  if (!row?.sentAt) {
    redirect(`/app/pulse-reports/${reportId}?error=notsent`);
  }
  try {
    const q = new Queue(QUEUE_MAILERS, { connection: getRedis() });
    await q.add("ResendPulseReportJob", { pulseReportId: reportId }, { removeOnComplete: 100, removeOnFail: 300 });
  } catch {
    // optional
  }
  revalidatePath(`/app/pulse-reports/${reportId}`);
  redirect(`/app/pulse-reports/${reportId}?notice=resend`);
}

const IDEA_PR_STATUS_PENDING = 0;

/** Creates a pending PR row and enqueues GitHub generation. */
export async function generatePrForIdeaAction(ideaId: number, _formData?: FormData): Promise<void> {
  const { projectId } = await requireEditor();
  const db = getDb();

  const [gh] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.projectId, projectId),
        eq(integrations.sourceType, IntegrationSourceType.github),
        eq(integrations.enabled, true),
      ),
    )
    .limit(1);
  if (!gh) {
    redirect("/app/pulse-reports?error=nogithub");
  }

  const [existing] = await db
    .select()
    .from(ideaPullRequests)
    .where(and(eq(ideaPullRequests.ideaId, ideaId), inArray(ideaPullRequests.status, [0, 1])))
    .limit(1);
  if (existing) {
    redirect("/app/pulse-reports?error=prpending");
  }

  const now = new Date();
  const [pr] = await db
    .insert(ideaPullRequests)
    .values({
      ideaId,
      integrationId: gh.id,
      status: IDEA_PR_STATUS_PENDING,
      progressStep: 0,
      progressMessage: "Queued for processing…",
      filesChanged: [],
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: ideaPullRequests.id });

  if (!pr) {
    redirect("/app/pulse-reports?error=prcreate");
  }

  try {
    const q = new Queue(QUEUE_DEFAULT, { connection: getRedis() });
    await q.add(
      "GenerateGithubPrJob",
      { ideaId, integrationId: gh.id, pullRequestId: pr.id },
      { removeOnComplete: 200, removeOnFail: 500 },
    );
  } catch {
    // optional
  }

  revalidatePath("/app/pulse-reports");
  redirect("/app/pulse-reports?notice=pr");
}
