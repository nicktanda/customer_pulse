import type { Job } from "bullmq";
import { eq, sql } from "drizzle-orm";
import { getWorkerDb } from "./db.js";
import {
  feedbacks,
  integrations,
  pulseReports,
  ideaPullRequests,
  projects,
} from "@customer-pulse/db/client";
import { processReportingNlJob } from "./reporting-nl.js";

/**
 * BullMQ job processors (syncs, mail, AI, etc.) — keep handlers idempotent when possible.
 * Many paths are still thin: they update the DB and log so the UI and queues show real progress.
 */
export async function runJob(job: Job): Promise<void> {
  console.log(`[worker] job start name=${job.name} id=${job.id}`);
  const db = getWorkerDb();

  switch (job.name) {
    case "process_feedback": {
      const feedbackId = Number((job.data as { feedbackId?: number }).feedbackId);
      if (!Number.isFinite(feedbackId)) {
        console.warn("[worker] process_feedback missing feedbackId");
        return;
      }
      const [row] = await db.select().from(feedbacks).where(eq(feedbacks.id, feedbackId)).limit(1);
      if (!row) {
        return;
      }
      const now = new Date();
      let summary = "AI processing stub — configure ANTHROPIC_API_KEY for live summaries.";
      const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
      if (apiKey) {
        try {
          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-20241022",
              max_tokens: 512,
              messages: [
                {
                  role: "user",
                  content: `In 2-3 sentences, summarize this customer feedback for a PM. Title: ${row.title ?? "(none)"}\n\n${row.content}`,
                },
              ],
            }),
          });
          if (res.ok) {
            const json = (await res.json()) as {
              content?: { type: string; text?: string }[];
            };
            const text = json.content?.find((c) => c.type === "text")?.text;
            if (text) {
              summary = text;
            }
          } else {
            summary = `Anthropic HTTP ${res.status} — left unprocessed text in DB.`;
          }
        } catch (e) {
          summary = `Anthropic error: ${e instanceof Error ? e.message : String(e)}`;
        }
      }
      await db
        .update(feedbacks)
        .set({
          aiSummary: summary,
          aiProcessedAt: now,
          aiConfidenceScore: apiKey ? 0.85 : 0,
          updatedAt: now,
        })
        .where(eq(feedbacks.id, feedbackId));
      return;
    }

    case "SendDailyPulseJob": {
      const single = Number((job.data as { projectId?: number }).projectId);
      const projectIds = Number.isFinite(single)
        ? [single]
        : (await db.select({ id: projects.id }).from(projects)).map((r) => r.id);

      const now = new Date();
      const periodEnd = now;
      const periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      for (const projectId of projectIds) {
        const [c] = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(feedbacks)
          .where(eq(feedbacks.projectId, projectId));
        const count = c?.n ?? 0;
        await db.insert(pulseReports).values({
          projectId,
          periodStart,
          periodEnd,
          feedbackCount: count,
          recipientCount: 0,
          summary: "Daily pulse: mail body not yet ported — report row created by worker.",
          sentAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }
      console.log(`[worker] SendDailyPulseJob handled for ${projectIds.length} project(s) (mailer stub).`);
      return;
    }

    case "ResendPulseReportJob": {
      const pulseReportId = Number((job.data as { pulseReportId?: number }).pulseReportId);
      console.log(`[worker] ResendPulseReportJob pulseReportId=${pulseReportId} (mailer stub)`);
      return;
    }

    case "GenerateGithubPrJob": {
      const pullRequestId = Number((job.data as { pullRequestId?: number }).pullRequestId);
      if (!Number.isFinite(pullRequestId)) {
        return;
      }
      const now = new Date();
      await db
        .update(ideaPullRequests)
        .set({
          status: 4,
          errorMessage: "GitHub PR generation not fully ported — job ran and marked failed for visibility.",
          progressMessage: "Stopped in stub worker",
          updatedAt: now,
        })
        .where(eq(ideaPullRequests.id, pullRequestId));
      return;
    }

    case "ProcessFeedbackBatchJob":
    case "SyncGoogleFormsJob":
    case "GenerateInsightsJob":
    case "WeeklyThemeAnalysisJob":
    case "BuildAttackGroupsJob":
    case "SyncJiraJob":
    case "SyncExcelOnlineJob":
    case "SyncGongJob":
    case "SyncSlackJob":
    case "SyncSentryJob":
    case "SyncZendeskJob":
    case "SyncIntercomJob":
    case "SyncLogrocketJob":
    case "SyncFullstoryJob":
    case "SyncLinearJob": {
      const integrationId = Number((job.data as { integrationId?: number }).integrationId);
      if (Number.isFinite(integrationId)) {
        await db
          .update(integrations)
          .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
          .where(eq(integrations.id, integrationId));
      }
      console.log(`[worker] ${job.name} stub — updated last_synced_at when integrationId provided`);
      return;
    }

    case "reporting_nl": {
      const requestId = Number((job.data as { requestId?: number }).requestId);
      if (!Number.isFinite(requestId)) {
        console.warn("[worker] reporting_nl missing requestId");
        return;
      }
      await processReportingNlJob(db, requestId);
      console.log(`[worker] reporting_nl done requestId=${requestId}`);
      return;
    }

    default:
      console.warn(`[worker] no handler for job name=${job.name}`);
  }
}
