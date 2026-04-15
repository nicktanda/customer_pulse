import type { Job } from "bullmq";
import { and, eq, gte, lte, isNull, sql, desc } from "drizzle-orm";
import { getWorkerDb } from "./db.js";
import {
  feedbacks,
  integrations,
  pulseReports,
  ideaPullRequests,
  projects,
  emailRecipients,
  insights,
  ideas,
  users,
} from "@customer-pulse/db/client";
import { processReportingNlJob } from "./reporting-nl.js";
import { sendEmail } from "./mail/send.js";
import { renderPulseReportHtml, renderPulseReportText } from "./mail/templates/pulse-report.js";
import { renderPasswordResetHtml, renderPasswordResetText } from "./mail/templates/password-reset.js";
import { processFeedbackBatch } from "./ai/feedback-processor.js";
import { runFullPipeline } from "./ai/orchestrator.js";
import { identifyThemes } from "./ai/theme-identifier.js";
import { buildAttackGroups } from "./ai/attack-group-builder.js";
import { createClient, SYNC_JOB_SOURCE_MAP } from "./integrations/index.js";
import { createPullRequest } from "./github/pr-creator.js";
import { resolveApiKey } from "./ai/call-claude.js";

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
      let summary = "AI processing — configure Anthropic API key in Settings or onboarding for live summaries.";
      const apiKey = await resolveApiKey();
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

      const periodEnd = new Date();
      const periodStart = new Date(periodEnd.getTime() - 24 * 60 * 60 * 1000);

      const categoryNames: Record<number, string> = { 0: "uncategorized", 1: "bug", 2: "feature_request", 3: "complaint" };
      const priorityNames: Record<number, string> = { 0: "unset", 1: "p1", 2: "p2", 3: "p3", 4: "p4" };
      const sourceNames: Record<number, string> = { 0: "linear", 1: "google_forms", 2: "slack", 3: "custom", 4: "gong", 5: "excel_online", 6: "jira", 7: "logrocket", 8: "fullstory", 9: "intercom", 10: "zendesk", 11: "sentry" };
      const severityNames: Record<number, string> = { 0: "informational", 1: "minor", 2: "moderate", 3: "major", 4: "critical" };
      const effortNames: Record<number, string> = { 0: "trivial", 1: "small", 2: "medium", 3: "large", 4: "extra_large" };
      const impactNames: Record<number, string> = { 0: "minimal", 1: "low", 2: "moderate", 3: "high", 4: "transformational" };

      for (const projectId of projectIds) {
        // The AI pipeline (ProcessFeedbackBatchJob, GenerateInsightsJob) runs
        // on its own schedule and keeps insights/ideas up-to-date.  The report
        // just queries whatever is already in the DB — running the full pipeline
        // inline would add 40+ Anthropic API calls and delay the report by minutes.

        // Fetch feedback in period
        const periodFeedback = await db
          .select()
          .from(feedbacks)
          .where(and(eq(feedbacks.projectId, projectId), gte(feedbacks.createdAt, periodStart), lte(feedbacks.createdAt, periodEnd)));

        const count = periodFeedback.length;

        // High priority items (p1, p2)
        const highPri = periodFeedback
          .filter((f) => f.priority === 1 || f.priority === 2)
          .slice(0, 10)
          .map((f) => ({
            title: f.title ?? f.content.slice(0, 80),
            category: categoryNames[f.category] ?? "unknown",
            priority: priorityNames[f.priority] ?? "unknown",
          }));

        // Breakdowns
        const catBreak: Record<string, number> = {};
        const priBreak: Record<string, number> = {};
        const srcBreak: Record<string, number> = {};
        for (const f of periodFeedback) {
          const cat = categoryNames[f.category] ?? "other";
          catBreak[cat] = (catBreak[cat] ?? 0) + 1;
          const pri = priorityNames[f.priority] ?? "other";
          priBreak[pri] = (priBreak[pri] ?? 0) + 1;
          const src = sourceNames[f.source] ?? "other";
          srcBreak[src] = (srcBreak[src] ?? 0) + 1;
        }

        // Recent insights
        const recentInsights = await db
          .select({ title: insights.title, severity: insights.severity })
          .from(insights)
          .where(eq(insights.projectId, projectId))
          .orderBy(desc(insights.createdAt))
          .limit(5);

        // Quick wins (low effort, high+ impact)
        const quickWins = await db
          .select({ title: ideas.title, effortEstimate: ideas.effortEstimate, impactEstimate: ideas.impactEstimate })
          .from(ideas)
          .where(and(eq(ideas.projectId, projectId), lte(ideas.effortEstimate, 1), gte(ideas.impactEstimate, 3)))
          .orderBy(desc(ideas.createdAt))
          .limit(3);

        // High impact ideas
        const highImpact = await db
          .select({ title: ideas.title, effortEstimate: ideas.effortEstimate, impactEstimate: ideas.impactEstimate })
          .from(ideas)
          .where(and(eq(ideas.projectId, projectId), gte(ideas.impactEstimate, 3)))
          .orderBy(desc(ideas.createdAt))
          .limit(3);

        // Generate summary with Anthropic if available
        let summary = `${count} feedback items received in the last 24 hours.`;
        const apiKey = await resolveApiKey();
        if (apiKey && count > 0) {
          try {
            const top20 = periodFeedback.slice(0, 20).map((f) => `- [${categoryNames[f.category]}/${priorityNames[f.priority]}] ${f.title ?? f.content.slice(0, 100)}`).join("\n");
            const res = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
              body: JSON.stringify({
                model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-20241022",
                max_tokens: 300,
                messages: [{ role: "user", content: `Identify 2-3 key trends or themes from this customer feedback. Be concise (2-3 sentences max):\n\n${top20}` }],
              }),
            });
            if (res.ok) {
              const json = (await res.json()) as { content?: { type: string; text?: string }[] };
              const text = json.content?.find((c) => c.type === "text")?.text;
              if (text) summary = text;
            }
          } catch { /* fall through to default summary */ }
        }

        // Create pulse report
        const recipients = await db
          .select({ email: emailRecipients.email })
          .from(emailRecipients)
          .where(and(eq(emailRecipients.projectId, projectId), eq(emailRecipients.active, true)));

        const reportData = {
          periodStart,
          periodEnd,
          feedbackCount: count,
          summary,
          highPriorityItems: highPri,
          categoryBreakdown: catBreak,
          priorityBreakdown: priBreak,
          sourceBreakdown: srcBreak,
          recentInsights: recentInsights.map((i) => ({ title: i.title, severity: severityNames[i.severity] ?? "unknown" })),
          quickWins: quickWins.map((i) => ({ title: i.title, effort: effortNames[i.effortEstimate] ?? "unknown", impact: impactNames[i.impactEstimate] ?? "unknown" })),
          highImpactIdeas: highImpact.map((i) => ({ title: i.title, effort: effortNames[i.effortEstimate] ?? "unknown", impact: impactNames[i.impactEstimate] ?? "unknown" })),
        };

        const html = renderPulseReportHtml(reportData);
        const text = renderPulseReportText(reportData);
        const recipientEmails = recipients.map((r) => r.email);

        let sentCount = 0;
        if (recipientEmails.length > 0) {
          const subject = `Customer Pulse - ${periodStart.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
          const result = await sendEmail({ to: recipientEmails, subject, html, text });
          if (result.ok) sentCount = recipientEmails.length;
        }

        const finishedAt = new Date();
        await db.insert(pulseReports).values({
          projectId,
          periodStart,
          periodEnd,
          feedbackCount: count,
          recipientCount: sentCount,
          summary,
          sentAt: sentCount > 0 ? finishedAt : null,
          createdAt: finishedAt,
          updatedAt: finishedAt,
        });
      }
      console.log(`[worker] SendDailyPulseJob completed for ${projectIds.length} project(s)`);
      return;
    }

    case "ResendPulseReportJob": {
      const pulseReportId = Number((job.data as { pulseReportId?: number }).pulseReportId);
      if (!Number.isFinite(pulseReportId)) return;

      const [report] = await db.select().from(pulseReports).where(eq(pulseReports.id, pulseReportId)).limit(1);
      if (!report) return;

      const recipients = await db
        .select({ email: emailRecipients.email })
        .from(emailRecipients)
        .where(and(eq(emailRecipients.projectId, report.projectId), eq(emailRecipients.active, true)));

      if (recipients.length === 0) {
        console.warn("[worker] ResendPulseReportJob — no active recipients");
        return;
      }

      const subject = `Customer Pulse - ${report.periodStart.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} (resent)`;
      // Simplified resend using stored summary
      const html = renderPulseReportHtml({
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        feedbackCount: report.feedbackCount,
        summary: report.summary ?? "",
        highPriorityItems: [],
        categoryBreakdown: {},
        priorityBreakdown: {},
        sourceBreakdown: {},
        recentInsights: [],
        quickWins: [],
        highImpactIdeas: [],
      });
      const text = renderPulseReportText({
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        feedbackCount: report.feedbackCount,
        summary: report.summary ?? "",
        highPriorityItems: [],
        categoryBreakdown: {},
        priorityBreakdown: {},
        sourceBreakdown: {},
        recentInsights: [],
        quickWins: [],
        highImpactIdeas: [],
      });

      const recipientEmails = recipients.map((r) => r.email);
      const result = await sendEmail({ to: recipientEmails, subject, html, text });
      if (result.ok) {
        const now = new Date();
        await db
          .update(pulseReports)
          .set({ sentAt: now, recipientCount: recipientEmails.length, updatedAt: now })
          .where(eq(pulseReports.id, pulseReportId));
      }
      console.log(`[worker] ResendPulseReportJob done pulseReportId=${pulseReportId}`);
      return;
    }

    case "SendPasswordResetJob": {
      const email = String((job.data as { email?: string }).email ?? "");
      const token = String((job.data as { token?: string }).token ?? "");
      if (!email || !token) return;

      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      const html = renderPasswordResetHtml(resetUrl);
      const text = renderPasswordResetText(resetUrl);
      await sendEmail({ to: email, subject: "Reset your Customer Pulse password", html, text });
      console.log(`[worker] SendPasswordResetJob sent to ${email}`);
      return;
    }

    case "GenerateGithubPrJob": {
      const pullRequestId = Number((job.data as { pullRequestId?: number }).pullRequestId);
      if (!Number.isFinite(pullRequestId)) {
        return;
      }
      try {
        await createPullRequest(db, pullRequestId);
        console.log(`[worker] GenerateGithubPrJob completed pullRequestId=${pullRequestId}`);
      } catch (err) {
        console.error(`[worker] GenerateGithubPrJob failed:`, err instanceof Error ? err.message : err);
        // Error state is already set by createPullRequest
      }
      return;
    }

    case "GithubAutoMergeJob": {
      const pullRequestId = Number((job.data as { pullRequestId?: number }).pullRequestId);
      if (!Number.isFinite(pullRequestId)) return;

      const [pr] = await db.select().from(ideaPullRequests).where(eq(ideaPullRequests.id, pullRequestId)).limit(1);
      if (!pr || pr.status !== 1 || !pr.prNumber) return; // only merge open PRs

      const [integration] = await db.select().from(integrations).where(eq(integrations.id, pr.integrationId)).limit(1);
      if (!integration) return;

      const { decryptCredentialsColumn } = await import("@customer-pulse/db/lockbox");
      const masterKey = process.env.LOCKBOX_MASTER_KEY ?? "";
      const decrypted = decryptCredentialsColumn(integration.credentialsCiphertext, masterKey);
      const creds = JSON.parse(decrypted) as { access_token: string; owner: string; repo: string };
      const headers = { Authorization: `token ${creds.access_token}`, Accept: "application/vnd.github.v3+json", "Content-Type": "application/json" };

      try {
        // Check if PR is mergeable
        const prRes = await fetch(`https://api.github.com/repos/${creds.owner}/${creds.repo}/pulls/${pr.prNumber}`, { headers });
        if (!prRes.ok) return;
        const prData = (await prRes.json()) as { mergeable?: boolean; state?: string };
        if (prData.state !== "open" || !prData.mergeable) return;

        // Merge
        const mergeRes = await fetch(`https://api.github.com/repos/${creds.owner}/${creds.repo}/pulls/${pr.prNumber}/merge`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ merge_method: "squash" }),
        });
        if (mergeRes.ok) {
          const now = new Date();
          await db.update(ideaPullRequests).set({ status: 2, mergedAt: now, updatedAt: now }).where(eq(ideaPullRequests.id, pullRequestId));
          console.log(`[worker] GithubAutoMergeJob merged PR #${pr.prNumber}`);
        }
      } catch (err) {
        console.error(`[worker] GithubAutoMergeJob error:`, err instanceof Error ? err.message : err);
      }
      return;
    }

    case "ProcessFeedbackBatchJob": {
      const { processed, remaining } = await processFeedbackBatch(db, 100);
      console.log(`[worker] ProcessFeedbackBatchJob processed=${processed} remaining=${remaining}`);
      if (remaining) {
        // Self-reschedule after 1 minute if more items remain
        const { Queue } = await import("bullmq");
        const { getRedisConnection } = await import("./redis.js");
        const { QUEUE_DEFAULT } = await import("./queue-names.js");
        const q = new Queue(QUEUE_DEFAULT, { connection: getRedisConnection() });
        await q.add("ProcessFeedbackBatchJob", {}, { delay: 60_000, removeOnComplete: 100, removeOnFail: 500 });
      }
      return;
    }

    case "GenerateInsightsJob": {
      // Run the full AI pipeline for all projects
      const allProjects = await db.select({ id: projects.id }).from(projects);
      for (const proj of allProjects) {
        await runFullPipeline(db, proj.id);
      }
      console.log(`[worker] GenerateInsightsJob completed for ${allProjects.length} project(s)`);
      return;
    }

    case "WeeklyThemeAnalysisJob": {
      const allProjects = await db.select({ id: projects.id }).from(projects);
      for (const proj of allProjects) {
        const created = await identifyThemes(db, proj.id);
        console.log(`[worker] WeeklyThemeAnalysisJob project=${proj.id} themes=${created}`);
      }
      return;
    }

    case "BuildAttackGroupsJob": {
      const allProjects = await db.select({ id: projects.id }).from(projects);
      for (const proj of allProjects) {
        const groups = await buildAttackGroups(db, proj.id);
        console.log(`[worker] BuildAttackGroupsJob project=${proj.id} groups=${groups.length}`);
      }
      return;
    }

    case "SyncGoogleFormsJob":
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
      const sourceType = SYNC_JOB_SOURCE_MAP[job.name];
      if (sourceType === undefined) {
        console.warn(`[worker] No source type mapping for ${job.name}`);
        return;
      }

      // If specific integrationId provided, sync just that one; otherwise sync all enabled of this type
      const integrationId = Number((job.data as { integrationId?: number }).integrationId);
      const rows = Number.isFinite(integrationId)
        ? await db.select().from(integrations).where(and(eq(integrations.id, integrationId), eq(integrations.enabled, true))).limit(1)
        : await db.select().from(integrations).where(and(eq(integrations.sourceType, sourceType), eq(integrations.enabled, true)));

      for (const row of rows) {
        const client = createClient(db, row);
        if (!client) {
          console.warn(`[worker] No client for source_type=${row.sourceType}`);
          continue;
        }
        try {
          const result = await client.sync();
          console.log(`[worker] ${job.name} integration=${row.id} created=${result.created} skipped=${result.skipped} errors=${result.errors}`);
        } catch (err) {
          console.error(`[worker] ${job.name} integration=${row.id} error:`, err instanceof Error ? err.message : err);
          // Still update last_synced_at so we don't retry immediately
          await db.update(integrations).set({ lastSyncedAt: new Date(), updatedAt: new Date() }).where(eq(integrations.id, row.id));
        }
      }
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
