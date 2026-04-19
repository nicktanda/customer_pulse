import "server-only";

import { and, eq, inArray, like, or, sql } from "drizzle-orm";
import type { Database } from "@customer-pulse/db/client";

/** Drizzle transaction callback receives this; it supports the same query API as `getDb()` but is not the full `Database` type. */
type DbLike = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];
import {
  emailRecipients,
  feedbackInsights,
  feedbacks,
  insights,
  insightThemes,
  integrations,
  projects,
  pulseReports,
  reportingRequests,
  teams,
  themes,
  FeedbackCategory,
  FeedbackPriority,
  FeedbackSource,
  FeedbackStatus,
  IntegrationSourceType,
  ReportingOutputMode,
  ReportingRequestStatus,
} from "@customer-pulse/db/client";

/** Written at the start of `pulse_reports.summary` so we can find and delete demo rows safely. */
const PULSE_SUMMARY_MARKER = "<!--cp-demo-->\n";

/** Prefix for `reporting_requests.prompt` — we use `position(... in prompt) = 1` in SQL to avoid LIKE bracket issues with `[demo]`. */
const REPORTING_PROMPT_PREFIX = "[demo] ";

/** `feedbacks.raw_data` flag — stored as JSON boolean; Postgres `->>'_cpDemo'` yields text `'true'`. */
const rawDemo = (): Record<string, unknown> => ({ _cpDemo: true });

/** Same idea for `themes.metadata` / `insights.metadata` (JSON object). */
const metaDemo = (): Record<string, unknown> => ({ _cpDemo: true });

const DEMO_EMAILS = ["pulse-demo@example.com", "pulse-demo-csm@example.com"] as const;

/**
 * Removes all rows previously inserted by `seedDemoDataForProject` for this project.
 * Order respects typical FK chains (feedback_insights → feedbacks, insight_themes → insights/themes).
 */
/**
 * True when this project still has feedback rows inserted by the demo seed (`_cpDemo` in `raw_data`).
 * Used on Settings to show whether “demo mode” is effectively on.
 */
export async function projectHasDemoSeedData(db: DbLike, projectId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: feedbacks.id })
    .from(feedbacks)
    .where(and(eq(feedbacks.projectId, projectId), sql`${feedbacks.rawData}->>'_cpDemo' = 'true'`))
    .limit(1);
  return row != null;
}

export async function removeDemoDataForProject(db: DbLike, projectId: number): Promise<void> {
  const demoFeedbackRows = await db
    .select({ id: feedbacks.id })
    .from(feedbacks)
    .where(
      and(eq(feedbacks.projectId, projectId), sql`${feedbacks.rawData}->>'_cpDemo' = 'true'`),
    );

  const demoFeedbackIds = demoFeedbackRows.map((r) => r.id);
  if (demoFeedbackIds.length > 0) {
    await db.delete(feedbackInsights).where(inArray(feedbackInsights.feedbackId, demoFeedbackIds));
  }

  await db
    .delete(feedbacks)
    .where(and(eq(feedbacks.projectId, projectId), sql`${feedbacks.rawData}->>'_cpDemo' = 'true'`));

  const demoInsightRows = await db
    .select({ id: insights.id })
    .from(insights)
    .where(and(eq(insights.projectId, projectId), sql`${insights.metadata}->>'_cpDemo' = 'true'`));

  const demoThemeRows = await db
    .select({ id: themes.id })
    .from(themes)
    .where(and(eq(themes.projectId, projectId), sql`${themes.metadata}->>'_cpDemo' = 'true'`));

  const demoInsightIds = demoInsightRows.map((r) => r.id);
  const demoThemeIds = demoThemeRows.map((r) => r.id);

  if (demoInsightIds.length > 0 && demoThemeIds.length > 0) {
    await db.delete(insightThemes).where(
      or(
        inArray(insightThemes.insightId, demoInsightIds),
        inArray(insightThemes.themeId, demoThemeIds),
      ),
    );
  } else if (demoInsightIds.length > 0) {
    await db.delete(insightThemes).where(inArray(insightThemes.insightId, demoInsightIds));
  } else if (demoThemeIds.length > 0) {
    await db.delete(insightThemes).where(inArray(insightThemes.themeId, demoThemeIds));
  }

  await db
    .delete(insights)
    .where(and(eq(insights.projectId, projectId), sql`${insights.metadata}->>'_cpDemo' = 'true'`));

  await db
    .delete(themes)
    .where(and(eq(themes.projectId, projectId), sql`${themes.metadata}->>'_cpDemo' = 'true'`));

  await db
    .delete(reportingRequests)
    .where(
      and(
        eq(reportingRequests.projectId, projectId),
        sql`position(${REPORTING_PROMPT_PREFIX} in ${reportingRequests.prompt}) = 1`,
      ),
    );

  await db
    .delete(pulseReports)
    .where(and(eq(pulseReports.projectId, projectId), like(pulseReports.summary, `${PULSE_SUMMARY_MARKER}%`)));

  for (const email of DEMO_EMAILS) {
    await db
      .delete(emailRecipients)
      .where(and(eq(emailRecipients.projectId, projectId), eq(emailRecipients.email, email)));
  }

  await db
    .delete(integrations)
    .where(
      and(eq(integrations.projectId, projectId), like(integrations.name, "Demo:%"), eq(integrations.enabled, false)),
    );

  await db.delete(teams).where(and(eq(teams.projectId, projectId), like(teams.name, "Demo:%")));

  const [proj] = await db
    .select({
      businessObjectives: projects.businessObjectives,
      businessStrategy: projects.businessStrategy,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (proj?.businessObjectives?.startsWith(PULSE_SUMMARY_MARKER.trim())) {
    await db.update(projects).set({ businessObjectives: null }).where(eq(projects.id, projectId));
  }
  if (proj?.businessStrategy?.startsWith(PULSE_SUMMARY_MARKER.trim())) {
    await db.update(projects).set({ businessStrategy: null }).where(eq(projects.id, projectId));
  }
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * Inserts synthetic rows for the current project so Dashboard, Feedback, Reporting, etc. look realistic.
 * Call `removeDemoDataForProject` first so the operation is idempotent.
 */
export async function seedDemoDataForProject(
  db: Database,
  params: { projectId: number; userId: number },
): Promise<void> {
  const { projectId, userId } = params;
  const now = new Date();

  const markerLine = PULSE_SUMMARY_MARKER.trim();
  const demoObjectives =
    markerLine + "\n\nGrow retention in mid-market accounts; shorten time-to-value for new workspaces.";
  const demoStrategy =
    markerLine +
    "\n\nDouble down on onboarding quality, ship billing transparency, and reduce support-to-engineering handoffs.";

  await db.transaction(async (tx) => {
    await removeDemoDataForProject(tx, projectId);

    // Do not wipe real strategy text: only fill these fields if empty or left over from a prior demo run.
    const [projRow] = await tx
      .select({
        businessObjectives: projects.businessObjectives,
        businessStrategy: projects.businessStrategy,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    const nextObjectives =
      !projRow?.businessObjectives || projRow.businessObjectives.startsWith(markerLine)
        ? demoObjectives
        : projRow.businessObjectives;
    const nextStrategy =
      !projRow?.businessStrategy || projRow.businessStrategy.startsWith(markerLine)
        ? demoStrategy
        : projRow.businessStrategy;

    await tx
      .update(projects)
      .set({
        businessObjectives: nextObjectives,
        businessStrategy: nextStrategy,
        updatedAt: now,
      })
      .where(eq(projects.id, projectId));

    await tx.insert(teams).values([
      {
        projectId,
        name: "Demo: Product",
        objectives: "Ship roadmap themes tied to customer outcomes; keep NPS trending up.",
        strategy: "Quarterly bets: onboarding, integrations polish, admin reporting.",
        createdAt: now,
        updatedAt: now,
      },
      {
        projectId,
        name: "Demo: Customer Success",
        objectives: "Proactive outreach on churn risk; clearer escalation paths.",
        strategy: "Playbooks for onboarding checkpoints; weekly feedback review with Product.",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await tx.insert(integrations).values([
      {
        projectId,
        name: "Demo: Linear",
        sourceType: IntegrationSourceType.linear,
        credentialsCiphertext: null,
        enabled: false,
        createdAt: now,
        updatedAt: now,
        webhookSecret: null,
        lastSyncedAt: null,
        syncFrequencyMinutes: 15,
      },
      {
        projectId,
        name: "Demo: Slack",
        sourceType: IntegrationSourceType.slack,
        credentialsCiphertext: null,
        enabled: false,
        createdAt: now,
        updatedAt: now,
        webhookSecret: null,
        lastSyncedAt: null,
        syncFrequencyMinutes: 15,
      },
      {
        projectId,
        name: "Demo: Jira",
        sourceType: IntegrationSourceType.jira,
        credentialsCiphertext: null,
        enabled: false,
        createdAt: now,
        updatedAt: now,
        webhookSecret: null,
        lastSyncedAt: null,
        syncFrequencyMinutes: 15,
      },
    ]);

    await tx.insert(emailRecipients).values([
      {
        projectId,
        email: DEMO_EMAILS[0]!,
        name: "Demo PM",
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        projectId,
        email: DEMO_EMAILS[1]!,
        name: "Demo CS Lead",
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    type FeedbackSeed = {
      source: number;
      title: string;
      content: string;
      category: number;
      priority: number;
      status: number;
      daysAgo: number;
      ai?: { summary: string };
    };

    const feedbackSeeds: FeedbackSeed[] = [
      {
        source: FeedbackSource.linear,
        title: "Export to CSV times out on large accounts",
        content:
          "When we try to export usage for accounts with >10k events, the job spins and eventually fails. This blocks our QBR deck.",
        category: FeedbackCategory.bug,
        priority: FeedbackPriority.p1,
        status: FeedbackStatus.triaged,
        daysAgo: 1,
        ai: { summary: "High-severity export failure affecting large customers; blocks customer-facing reporting." },
      },
      {
        source: FeedbackSource.slack,
        title: "Love the new digest — can we filter by team?",
        content:
          "#feedback from #customer-success: the daily Slack summary is great; they want per-team slices for handoff.",
        category: FeedbackCategory.feature_request,
        priority: FeedbackPriority.p2,
        status: FeedbackStatus.new_feedback,
        daysAgo: 2,
        ai: { summary: "Feature request: team-scoped digest views for CS handoff." },
      },
      {
        source: FeedbackSource.jira,
        title: "Webhook retries caused duplicate tickets",
        content: "Jira integration created two issues for the same Linear comment after a retry storm.",
        category: FeedbackCategory.bug,
        priority: FeedbackPriority.p2,
        status: FeedbackStatus.in_progress,
        daysAgo: 3,
      },
      {
        source: FeedbackSource.google_forms,
        title: "Onboarding checklist is unclear for invited users",
        content: "Form response: invited users do not see the first-run checklist until they refresh.",
        category: FeedbackCategory.complaint,
        priority: FeedbackPriority.p3,
        status: FeedbackStatus.new_feedback,
        daysAgo: 4,
        ai: { summary: "UX friction: invited users miss checklist until refresh." },
      },
      {
        source: FeedbackSource.custom,
        title: "API: idempotency key ignored on 429",
        content: "Our integration sends Idempotency-Key but still saw duplicate feedback rows after rate limits.",
        category: FeedbackCategory.bug,
        priority: FeedbackPriority.p1,
        status: FeedbackStatus.triaged,
        daysAgo: 5,
      },
      {
        source: FeedbackSource.intercom,
        title: "Need SSO with Okta ASAP",
        content: "Enterprise prospect requires Okta SAML this quarter; asked for rough timeline.",
        category: FeedbackCategory.feature_request,
        priority: FeedbackPriority.p2,
        status: FeedbackStatus.new_feedback,
        daysAgo: 6,
        ai: { summary: "Enterprise blocker: Okta SAML SSO timeline request." },
      },
      {
        source: FeedbackSource.zendesk,
        title: "Invoice PDF missing PO number",
        content: "Support ticket #4412: finance team says PO number field not appearing on generated PDFs.",
        category: FeedbackCategory.bug,
        priority: FeedbackPriority.p3,
        status: FeedbackStatus.resolved,
        daysAgo: 8,
        ai: { summary: "Billing PDF missing PO number; marked resolved in demo data." },
      },
      {
        source: FeedbackSource.sentry,
        title: "Spike in timeout errors on /app/reporting",
        content: "Sentry issue REPORT-TIMEOUT: reporting page slow for projects with >50k feedback rows.",
        category: FeedbackCategory.bug,
        priority: FeedbackPriority.p2,
        status: FeedbackStatus.in_progress,
        daysAgo: 9,
      },
      {
        source: FeedbackSource.logrocket,
        title: "Users rage-clicking Save on integrations form",
        content: "Session replay shows multiple clicks when validation error is easy to miss.",
        category: FeedbackCategory.complaint,
        priority: FeedbackPriority.p3,
        status: FeedbackStatus.triaged,
        daysAgo: 10,
        ai: { summary: "Form validation discoverability issue on integrations screen." },
      },
      {
        source: FeedbackSource.fullstory,
        title: "Search on feedback list feels laggy",
        content: "FullStory funnel: users pause after typing in search — possible debounce or index issue.",
        category: FeedbackCategory.feature_request,
        priority: FeedbackPriority.p4,
        status: FeedbackStatus.archived,
        daysAgo: 12,
      },
      {
        source: FeedbackSource.linear,
        title: "Dark mode contrast on badges",
        content: "Accessibility: priority badges in dark theme fail contrast in sidebar.",
        category: FeedbackCategory.bug,
        priority: FeedbackPriority.p3,
        status: FeedbackStatus.new_feedback,
        daysAgo: 14,
      },
      {
        source: FeedbackSource.slack,
        title: "Can pulse include top themes?",
        content: "Asked in #product: weekly email should surface top 3 themes, not only counts.",
        category: FeedbackCategory.feature_request,
        priority: FeedbackPriority.p2,
        status: FeedbackStatus.triaged,
        daysAgo: 16,
        ai: { summary: "Pulse digest enhancement: include ranked themes." },
      },
      {
        source: FeedbackSource.custom,
        title: "Webhook signature docs example uses wrong header",
        content: "Docs show X-Signature but API expects X-Kairos-Signature — caused a failed test.",
        category: FeedbackCategory.complaint,
        priority: FeedbackPriority.p4,
        status: FeedbackStatus.resolved,
        daysAgo: 18,
      },
      {
        source: FeedbackSource.jira,
        title: "Bulk status update would save CS hours",
        content: "CS wants to select 20 items and move to triaged from the list view.",
        category: FeedbackCategory.feature_request,
        priority: FeedbackPriority.p3,
        status: FeedbackStatus.new_feedback,
        daysAgo: 20,
      },
      {
        source: FeedbackSource.google_forms,
        title: "Mobile layout breaks on strategy tab",
        content: "NPS follow-up: strategy page overflows horizontally on iPhone Safari.",
        category: FeedbackCategory.bug,
        priority: FeedbackPriority.p2,
        status: FeedbackStatus.in_progress,
        daysAgo: 22,
      },
      {
        source: FeedbackSource.intercom,
        title: "Great support on the migration",
        content: "Positive note: customer praised hands-on help moving from spreadsheet workflow.",
        category: FeedbackCategory.uncategorized,
        priority: FeedbackPriority.p4,
        status: FeedbackStatus.archived,
        daysAgo: 24,
      },
      {
        source: FeedbackSource.zendesk,
        title: "Role viewer cannot see pulse history",
        content: "Viewer role expected read-only pulse reports but UI hides the tab — intentional?",
        category: FeedbackCategory.feature_request,
        priority: FeedbackPriority.p3,
        status: FeedbackStatus.triaged,
        daysAgo: 26,
      },
      {
        source: FeedbackSource.sentry,
        title: "Null ref in theme chart empty state",
        content: "Error when zero themes in range — should show empty state component.",
        category: FeedbackCategory.bug,
        priority: FeedbackPriority.p3,
        status: FeedbackStatus.new_feedback,
        daysAgo: 28,
      },
    ];

    const crypto = await import("node:crypto");
    const feedbackValues = feedbackSeeds.map((f) => {
      const createdAt = daysAgo(f.daysAgo);
      const extId = `cp_demo_${crypto.randomUUID()}`;
      const hasAi = Boolean(f.ai);
      return {
        projectId,
        source: f.source,
        sourceExternalId: extId,
        title: f.title,
        content: f.content,
        category: f.category,
        priority: f.priority,
        status: f.status,
        authorName: "Demo Customer",
        authorEmail: "customer-demo@example.com",
        rawData: { ...rawDemo(), seedTitle: f.title },
        createdAt,
        updatedAt: createdAt,
        aiSummary: f.ai?.summary ?? null,
        aiConfidenceScore: hasAi ? 0.82 : null,
        aiProcessedAt: hasAi ? createdAt : null,
        manuallyReviewed: false,
        insightProcessedAt: null,
      };
    });

    const insertedFeedback = await tx.insert(feedbacks).values(feedbackValues).returning({ id: feedbacks.id });

    const [t1] = await tx
      .insert(themes)
      .values({
        projectId,
        name: "Onboarding & activation",
        description: "Friction during first session and checklist completion.",
        priorityScore: 88,
        insightCount: 3,
        affectedUsersEstimate: 420,
        metadata: metaDemo(),
        analyzedAt: daysAgo(2),
        createdAt: daysAgo(25),
        updatedAt: now,
      })
      .returning({ id: themes.id });

    const [t2] = await tx
      .insert(themes)
      .values({
        projectId,
        name: "Reliability & exports",
        description: "Timeouts, duplicates, and large-account edge cases.",
        priorityScore: 76,
        insightCount: 2,
        affectedUsersEstimate: 210,
        metadata: metaDemo(),
        analyzedAt: daysAgo(3),
        createdAt: daysAgo(24),
        updatedAt: now,
      })
      .returning({ id: themes.id });

    const [t3] = await tx
      .insert(themes)
      .values({
        projectId,
        name: "Enterprise requirements",
        description: "SSO, security review asks, and procurement-friendly reporting.",
        priorityScore: 64,
        insightCount: 2,
        affectedUsersEstimate: 95,
        metadata: metaDemo(),
        analyzedAt: daysAgo(5),
        createdAt: daysAgo(20),
        updatedAt: now,
      })
      .returning({ id: themes.id });

    const [ins1] = await tx
      .insert(insights)
      .values({
        projectId,
        title: "Export failures cluster on large tenants",
        description:
          "Multiple reports of CSV export timeouts correlate with accounts over 10k events — likely worker memory ceiling.",
        insightType: 0,
        severity: 2,
        confidenceScore: 78,
        affectedUsersCount: 35,
        feedbackCount: 4,
        status: 0,
        pmPersonaId: null,
        evidence: [],
        metadata: metaDemo(),
        discoveredAt: daysAgo(4),
        createdAt: daysAgo(10),
        updatedAt: now,
      })
      .returning({ id: insights.id });

    const [ins2] = await tx
      .insert(insights)
      .values({
        projectId,
        title: "Digest content wants more narrative",
        description: "Users ask for themes and highlights inside the email, not only counts.",
        insightType: 0,
        severity: 1,
        confidenceScore: 71,
        affectedUsersCount: 120,
        feedbackCount: 6,
        status: 0,
        pmPersonaId: null,
        evidence: [],
        metadata: metaDemo(),
        discoveredAt: daysAgo(6),
        createdAt: daysAgo(12),
        updatedAt: now,
      })
      .returning({ id: insights.id });

    const themeIds = [t1?.id, t2?.id, t3?.id].filter((x): x is number => x != null);
    const insightIds = [ins1?.id, ins2?.id].filter((x): x is number => x != null);

    if (insightIds[0] != null && themeIds[1] != null) {
      await tx.insert(insightThemes).values({
        insightId: insightIds[0]!,
        themeId: themeIds[1]!,
        relevanceScore: 0.91,
        createdAt: now,
        updatedAt: now,
      });
    }
    if (insightIds[1] != null && themeIds[0] != null) {
      await tx.insert(insightThemes).values({
        insightId: insightIds[1]!,
        themeId: themeIds[0]!,
        relevanceScore: 0.85,
        createdAt: now,
        updatedAt: now,
      });
    }

    const fid0 = insertedFeedback[0]?.id;
    const fid1 = insertedFeedback[1]?.id;
    if (insightIds[0] != null && fid0 != null) {
      await tx.insert(feedbackInsights).values({
        feedbackId: fid0,
        insightId: insightIds[0]!,
        relevanceScore: 0.88,
        contributionSummary: "Direct report of export failure on large account.",
        createdAt: now,
        updatedAt: now,
      });
    }
    if (insightIds[1] != null && fid1 != null) {
      await tx.insert(feedbackInsights).values({
        feedbackId: fid1,
        insightId: insightIds[1]!,
        relevanceScore: 0.72,
        contributionSummary: "Asks for team-scoped digest slices.",
        createdAt: now,
        updatedAt: now,
      });
    }

    await tx.insert(pulseReports).values([
      {
        projectId,
        sentAt: daysAgo(7),
        periodStart: daysAgo(14),
        periodEnd: daysAgo(7),
        feedbackCount: 42,
        recipientCount: 8,
        summary:
          PULSE_SUMMARY_MARKER +
          "Last week: volume up slightly vs prior period. Top themes: onboarding friction, export reliability, enterprise SSO asks. " +
          "CS flagged two P1s now in progress.",
        createdAt: daysAgo(7),
        updatedAt: daysAgo(7),
      },
      {
        projectId,
        sentAt: daysAgo(14),
        periodStart: daysAgo(21),
        periodEnd: daysAgo(14),
        feedbackCount: 36,
        recipientCount: 7,
        summary:
          PULSE_SUMMARY_MARKER +
          "Prior week: steady inbound from Slack and Linear. Notable win: positive migration story from long-time spreadsheet user.",
        createdAt: daysAgo(14),
        updatedAt: daysAgo(14),
      },
      {
        projectId,
        sentAt: daysAgo(21),
        periodStart: daysAgo(28),
        periodEnd: daysAgo(21),
        feedbackCount: 29,
        recipientCount: 6,
        summary:
          PULSE_SUMMARY_MARKER +
          "Earlier period: bug reports dominated; team closed several PDF/invoice edge cases.",
        createdAt: daysAgo(21),
        updatedAt: daysAgo(21),
      },
    ]);

    await tx.insert(reportingRequests).values([
      {
        projectId,
        userId,
        prompt:
          REPORTING_PROMPT_PREFIX +
          "Summarize feedback trends for the last 30 days for leadership — bullets only.",
        outputMode: ReportingOutputMode.answer,
        status: ReportingRequestStatus.done,
        errorMessage: null,
        resultMarkdown:
          "## Demo answer\n\n- **Volume**: Steady with a small uptick from Slack.\n- **Themes**: Onboarding, exports, enterprise SSO.\n- **Risks**: Two reliability items still open.\n\n_This is synthetic output from the demo seed._",
        resultStructured: null,
        createdAt: daysAgo(2),
        updatedAt: daysAgo(2),
      },
      {
        projectId,
        userId,
        prompt: REPORTING_PROMPT_PREFIX + "What are the top customer complaints this month?",
        outputMode: ReportingOutputMode.report_chart,
        status: ReportingRequestStatus.done,
        errorMessage: null,
        resultMarkdown: "### Demo chart-ready summary\n\nComplaints concentrated in **billing PDFs** and **mobile layout** on small screens.",
        resultStructured: null,
        createdAt: daysAgo(5),
        updatedAt: daysAgo(5),
      },
    ]);
  });
}
