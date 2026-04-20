import Link from "next/link";
import { desc, eq, and, gte, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import {
  feedbacks,
  insights,
  reportingRequests,
  themes,
  ReportingOutputMode,
  ReportingRequestStatus,
} from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userHasProjectAccess } from "@/lib/project-access";
import { PageHeader, PageShell, ProjectAccessDenied } from "@/components/ui";
import { BreakdownBarChart, FeedbackVolumeLineChart } from "@/components/reporting/ReportingCharts";
import { ReportingNlAssistant } from "@/components/reporting/ReportingNlAssistant";
import { formatAppDateTime } from "@/lib/format-app-date";
import {
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_PRIORITY_LABELS,
  FEEDBACK_SOURCE_LABELS,
  FEEDBACK_STATUS_LABELS,
} from "@/lib/feedback-enums-display";

const RANGE_DAYS = [7, 30, 90] as const;

function parseRangeDays(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "30", 10);
  return RANGE_DAYS.includes(n as (typeof RANGE_DAYS)[number]) ? n : 30;
}

function statusText(s: number): string {
  switch (s) {
    case ReportingRequestStatus.pending:
      return "Pending";
    case ReportingRequestStatus.running:
      return "Running";
    case ReportingRequestStatus.done:
      return "Done";
    case ReportingRequestStatus.failed:
      return "Failed";
    default:
      return String(s);
  }
}

function outputModeText(m: number): string {
  return m === ReportingOutputMode.report_chart ? "Report / charts" : "Answer";
}

/** Map DB enum value to the same labels used on the Feedback page (chart axis + tooltips). */
function breakdownLabel(
  map: Record<number, string>,
  value: number,
  kind: string,
): string {
  return map[value] ?? `${kind} ${value}`;
}

/**
 * Deeper analytics for the current project: pick a time window, see volume + breakdowns, themes/insights, NL assistant.
 */
export default async function ReportingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  const sp = await searchParams;
  const rangeDays = parseRangeDays(typeof sp.range === "string" ? sp.range : undefined);

  if (projectId == null) {
    return (
      <PageShell width="full">
        <PageHeader
          title="Reporting"
          description={
            <>
              Select or{" "}
              <Link href="/app/projects/new" className="link-primary">
                create a project
              </Link>{" "}
              first.
            </>
          }
        />
      </PageShell>
    );
  }

  if (!(await userHasProjectAccess(userId, projectId))) {
    return <ProjectAccessDenied pageTitle="Reporting" />;
  }

  const db = await getRequestDb();
  const now = new Date();
  const start = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
  const dayTrunc = sql`date_trunc('day', ${feedbacks.createdAt})`;

  const [totalRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(feedbacks)
    .where(and(eq(feedbacks.projectId, projectId), gte(feedbacks.createdAt, start)));

  const dailyRows = await db
    .select({
      day: sql<string>`to_char(${dayTrunc}, 'YYYY-MM-DD')`,
      c: sql<number>`count(*)::int`,
    })
    .from(feedbacks)
    .where(and(eq(feedbacks.projectId, projectId), gte(feedbacks.createdAt, start)))
    .groupBy(dayTrunc)
    .orderBy(dayTrunc);

  const categoryRows = await db
    .select({
      category: feedbacks.category,
      c: sql<number>`count(*)::int`,
    })
    .from(feedbacks)
    .where(and(eq(feedbacks.projectId, projectId), gte(feedbacks.createdAt, start)))
    .groupBy(feedbacks.category);

  const priorityRows = await db
    .select({
      priority: feedbacks.priority,
      c: sql<number>`count(*)::int`,
    })
    .from(feedbacks)
    .where(and(eq(feedbacks.projectId, projectId), gte(feedbacks.createdAt, start)))
    .groupBy(feedbacks.priority);

  const statusRows = await db
    .select({
      status: feedbacks.status,
      c: sql<number>`count(*)::int`,
    })
    .from(feedbacks)
    .where(and(eq(feedbacks.projectId, projectId), gte(feedbacks.createdAt, start)))
    .groupBy(feedbacks.status);

  const sourceRows = await db
    .select({
      source: feedbacks.source,
      c: sql<number>`count(*)::int`,
    })
    .from(feedbacks)
    .where(and(eq(feedbacks.projectId, projectId), gte(feedbacks.createdAt, start)))
    .groupBy(feedbacks.source);

  const [themeCountRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(themes)
    .where(and(eq(themes.projectId, projectId), gte(themes.createdAt, start)));

  const [insightCountRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(insights)
    .where(and(eq(insights.projectId, projectId), gte(insights.createdAt, start)));

  const topThemes = await db
    .select({ id: themes.id, name: themes.name, priorityScore: themes.priorityScore })
    .from(themes)
    .where(and(eq(themes.projectId, projectId), gte(themes.createdAt, start)))
    .orderBy(desc(themes.priorityScore))
    .limit(8);

  const topInsights = await db
    .select({ id: insights.id, title: insights.title })
    .from(insights)
    .where(and(eq(insights.projectId, projectId), gte(insights.createdAt, start)))
    .orderBy(desc(insights.createdAt))
    .limit(8);

  const nlHistory = await db
    .select({
      id: reportingRequests.id,
      prompt: reportingRequests.prompt,
      status: reportingRequests.status,
      outputMode: reportingRequests.outputMode,
      createdAt: reportingRequests.createdAt,
    })
    .from(reportingRequests)
    .where(eq(reportingRequests.projectId, projectId))
    .orderBy(desc(reportingRequests.createdAt))
    .limit(15);

  const dailyVolume = dailyRows.map((r) => ({ day: r.day, count: r.c }));

  return (
    <PageShell width="full" className="d-flex flex-column gap-4">
      <PageHeader
        title="Reporting"
        description={
          <>
            Analytics for the last <span className="fw-medium">{rangeDays} days</span> in this project. Switch the
            window below; charts and tables update together.
          </>
        }
      />

      <div className="d-flex flex-wrap gap-2 align-items-center">
        <span className="small text-body-secondary me-1">Time range:</span>
        {RANGE_DAYS.map((d) => (
          <Link
            key={d}
            href={`/app/reporting?range=${d}`}
            className={`btn btn-sm ${d === rangeDays ? "btn-primary" : "btn-outline-secondary"}`}
            title={`Show analytics for the last ${d} days`}
            aria-label={`Last ${d} days${d === rangeDays ? ", selected" : ""}`}
            aria-current={d === rangeDays ? "page" : undefined}
          >
            <span className="d-none d-sm-inline">Last {d} days</span>
            <span className="d-sm-none">{d}d</span>
          </Link>
        ))}
      </div>

      <section className="row g-3">
        <div className="col-sm-6 col-md-4">
          <div className="card h-100 border-secondary-subtle shadow-sm">
            <div className="card-body">
              <p className="small fw-medium text-uppercase text-body-secondary mb-1">Feedback in window</p>
              <p className="h4 mb-0 text-body-emphasis">{totalRow?.c ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-md-4">
          <div className="card h-100 border-secondary-subtle shadow-sm">
            <div className="card-body">
              <p className="small fw-medium text-uppercase text-body-secondary mb-1">Themes (created in window)</p>
              <p className="h4 mb-0 text-body-emphasis">{themeCountRow?.c ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-md-4">
          <div className="card h-100 border-secondary-subtle shadow-sm">
            <div className="card-body">
              <p className="small fw-medium text-uppercase text-body-secondary mb-1">Insights (created in window)</p>
              <p className="h4 mb-0 text-body-emphasis">{insightCountRow?.c ?? 0}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="card border-secondary-subtle shadow-sm">
        <div className="card-body">
          <h2 className="h5 text-body-emphasis">Feedback volume by day</h2>
          <FeedbackVolumeLineChart data={dailyVolume} />
        </div>
      </section>

      <section className="row g-4">
        <div className="col-lg-6">
          <BreakdownBarChart
            title="By category"
            rows={categoryRows.map((r) => ({
              key: breakdownLabel(FEEDBACK_CATEGORY_LABELS, r.category, "Category"),
              count: r.c,
            }))}
          />
        </div>
        <div className="col-lg-6">
          <BreakdownBarChart
            title="By priority"
            rows={priorityRows.map((r) => ({
              key: breakdownLabel(FEEDBACK_PRIORITY_LABELS, r.priority, "Priority"),
              count: r.c,
            }))}
          />
        </div>
        <div className="col-lg-6">
          <BreakdownBarChart
            title="By status"
            rows={statusRows.map((r) => ({
              key: breakdownLabel(FEEDBACK_STATUS_LABELS, r.status, "Status"),
              count: r.c,
            }))}
          />
        </div>
        <div className="col-lg-6">
          <BreakdownBarChart
            title="By source"
            rows={sourceRows.map((r) => ({
              key: breakdownLabel(FEEDBACK_SOURCE_LABELS, r.source, "Source"),
              count: r.c,
            }))}
          />
        </div>
      </section>

      <section className="row g-4">
        <div className="col-lg-6">
          <div className="card h-100 border-secondary-subtle shadow-sm">
            <div className="card-body">
              <h2 className="h6 text-body-emphasis">Top themes</h2>
              <ul className="list-group list-group-flush small mt-2">
                {topThemes.length === 0 ? (
                  <li className="list-group-item text-body-secondary">None in this window.</li>
                ) : (
                  topThemes.map((t) => (
                    <li key={t.id} className="list-group-item d-flex justify-content-between">
                      <span>{t.name}</span>
                      <span className="text-body-secondary">score {t.priorityScore}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card h-100 border-secondary-subtle shadow-sm">
            <div className="card-body">
              <h2 className="h6 text-body-emphasis">Recent insights</h2>
              <ul className="list-group list-group-flush small mt-2">
                {topInsights.length === 0 ? (
                  <li className="list-group-item text-body-secondary">None in this window.</li>
                ) : (
                  topInsights.map((i) => (
                    <li key={i.id} className="list-group-item">
                      {i.title}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <ReportingNlAssistant />

      <section className="card border-secondary-subtle shadow-sm">
        <div className="card-body">
          <h2 className="h5 text-body-emphasis">Recent questions</h2>
          <p className="small text-body-secondary">
            History of natural-language requests for this project (newest first).
          </p>
          <ul className="list-group list-group-flush mt-3">
            {nlHistory.length === 0 ? (
              <li className="list-group-item text-body-secondary small">No requests yet.</li>
            ) : (
              nlHistory.map((h) => (
                <li key={h.id} className="list-group-item small">
                  <span className="fw-medium">{outputModeText(h.outputMode)}</span>
                  <span className="text-body-secondary"> · {statusText(h.status)}</span>
                  <p className="mb-0 mt-1">{h.prompt}</p>
                  <p className="text-body-tertiary mb-0 mt-1" style={{ fontSize: "0.75rem" }}>
                    {formatAppDateTime(h.createdAt)}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
