import { desc, eq, and, or, inArray, isNull, isNotNull, gte, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import {
  feedbacks,
  pulseReports,
  FeedbackPriority,
  FeedbackStatus,
} from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser, getCurrentProjectSummaryForUser } from "@/lib/current-project";
import { formatAppDateTime } from "@/lib/format-app-date";
import {
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_PRIORITY_LABELS,
  FEEDBACK_SOURCE_LABELS,
  FEEDBACK_STATUS_LABELS,
} from "@/lib/feedback-enums-display";
import Link from "next/link";
import { InlineAlert, MetricTile, PageHeader, PageShell } from "@/components/ui";
import { feedbackListHref } from "@/lib/feedback-list-query";
import { pulseReportsListHref } from "@/lib/pulse-reports-list-query";

/**
 * Dashboard scoped to the current project (main authenticated home).
 * Sections use `aria-labelledby` so screen-reader users can jump by landmark.
 */
export default async function DashboardPage() {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  const projectSummary = await getCurrentProjectSummaryForUser(userId);
  const db = getDb();

  if (projectId == null) {
    return (
      <PageShell width="full">
        <PageHeader
          title="Dashboard"
          description={
            <>
              You are not in any project yet.{" "}
              <Link href="/app/projects/new" className="link-primary">
                Create a project
              </Link>{" "}
              to get started.
            </>
          }
        />
      </PageShell>
    );
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(feedbacks)
    .where(eq(feedbacks.projectId, projectId));

  const [todayRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(feedbacks)
    .where(and(eq(feedbacks.projectId, projectId), gte(feedbacks.createdAt, startOfDay)));

  const [weekRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(feedbacks)
    .where(and(eq(feedbacks.projectId, projectId), gte(feedbacks.createdAt, weekAgo)));

  const [unprocessedRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(feedbacks)
    .where(and(eq(feedbacks.projectId, projectId), isNull(feedbacks.aiProcessedAt)));

  const categoryRows = await db
    .select({
      category: feedbacks.category,
      c: sql<number>`count(*)::int`,
    })
    .from(feedbacks)
    .where(eq(feedbacks.projectId, projectId))
    .groupBy(feedbacks.category);

  const priorityRows = await db
    .select({
      priority: feedbacks.priority,
      c: sql<number>`count(*)::int`,
    })
    .from(feedbacks)
    .where(eq(feedbacks.projectId, projectId))
    .groupBy(feedbacks.priority);

  const statusRows = await db
    .select({
      status: feedbacks.status,
      c: sql<number>`count(*)::int`,
    })
    .from(feedbacks)
    .where(eq(feedbacks.projectId, projectId))
    .groupBy(feedbacks.status);

  const sourceRows = await db
    .select({
      source: feedbacks.source,
      c: sql<number>`count(*)::int`,
    })
    .from(feedbacks)
    .where(eq(feedbacks.projectId, projectId))
    .groupBy(feedbacks.source);

  const recentFeedback = await db
    .select({
      id: feedbacks.id,
      title: feedbacks.title,
      createdAt: feedbacks.createdAt,
    })
    .from(feedbacks)
    .where(eq(feedbacks.projectId, projectId))
    .orderBy(desc(feedbacks.createdAt))
    .limit(10);

  const highPriorityFeedback = await db
    .select({
      id: feedbacks.id,
      title: feedbacks.title,
      priority: feedbacks.priority,
      status: feedbacks.status,
    })
    .from(feedbacks)
    .where(
      and(
        eq(feedbacks.projectId, projectId),
        inArray(feedbacks.priority, [FeedbackPriority.p1, FeedbackPriority.p2]),
        or(
          eq(feedbacks.status, FeedbackStatus.new_feedback),
          eq(feedbacks.status, FeedbackStatus.triaged),
        ),
      ),
    )
    .orderBy(desc(feedbacks.createdAt))
    .limit(5);

  const [latestPulse] = await db
    .select({
      id: pulseReports.id,
      sentAt: pulseReports.sentAt,
      periodStart: pulseReports.periodStart,
      periodEnd: pulseReports.periodEnd,
    })
    .from(pulseReports)
    .where(and(eq(pulseReports.projectId, projectId), isNotNull(pulseReports.sentAt)))
    .orderBy(desc(pulseReports.sentAt))
    .limit(1);

  const totalCount = totalRow?.c ?? 0;

  return (
    <PageShell width="full" className="d-flex flex-column gap-5">
      <PageHeader
        title="Dashboard"
        description={
          <>
            <span className="fw-medium">{projectSummary?.name ?? `Project #${projectId}`}</span>
            {projectSummary?.slug ? (
              <span className="text-body-tertiary"> · {projectSummary.slug}</span>
            ) : null}
          </>
        }
      />

      {totalCount === 0 ? (
        <InlineAlert variant="light">
          <p className="mb-2 small text-body-secondary">
            No feedback in this project yet. Connect a source to start capturing items.
          </p>
          <Link href="/app/integrations" className="btn btn-sm btn-primary">
            Go to integrations
          </Link>
        </InlineAlert>
      ) : null}

      <section aria-labelledby="dash-at-a-glance-heading">
        <h2 id="dash-at-a-glance-heading" className="h5 text-body-emphasis mb-0">
          At a glance
        </h2>
        <p className="small text-body-secondary mt-1 mb-3">
          Key counts for the current project. Click &quot;Unprocessed (AI)&quot; to open the matching queue in
          Feedback.
        </p>
        <div className="row g-3">
          <MetricTile label="Total feedback" value={totalCount} />
          <MetricTile label="Today" value={todayRow?.c ?? 0} />
          <MetricTile label="Last 7 days" value={weekRow?.c ?? 0} />
          <MetricTile
            label="Unprocessed (AI)"
            value={unprocessedRow?.c ?? 0}
            href="/app/feedback?ai=pending"
            linkHint="Open in Feedback"
          />
        </div>
      </section>

      <section aria-labelledby="dash-needs-attention-heading">
        <h2 id="dash-needs-attention-heading" className="h5 text-body-emphasis mb-0">
          Needs attention
        </h2>
        <p className="small text-body-secondary mt-1 mb-3">
          P1 / P2 items still in New or Triaged — jump in and triage or re-prioritize.
        </p>
        <div className="row g-4">
        <div className="col-lg-7">
          <ul className="list-group shadow-sm border-secondary-subtle">
            {highPriorityFeedback.length === 0 ? (
              <li className="list-group-item text-body-secondary small">None right now.</li>
            ) : (
              highPriorityFeedback.map((f) => (
                // Whole row is one link so users don’t have to hit the title only (opens Feedback with the right panel).
                <li key={f.id} className="list-group-item p-0">
                  <Link
                    href={feedbackListHref({ detail: f.id })}
                    className="d-block p-3 text-decoration-none text-reset"
                  >
                    <span className="fw-medium text-primary">{f.title || "(no title)"}</span>
                    <p className="small text-body-secondary mb-0 mt-1">
                      {FEEDBACK_PRIORITY_LABELS[f.priority] ?? `P${f.priority}`} ·{" "}
                      {FEEDBACK_STATUS_LABELS[f.status] ?? `Status ${f.status}`}
                    </p>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="col-lg-5">
          <div className="card h-100 shadow-sm border-secondary-subtle">
            <div className="card-body">
              <h3 className="h6 text-body-emphasis">AI processing queue</h3>
              <p className="small text-body-secondary mb-2">
                Items waiting for AI classification show up here. Open the full list to work through them.
              </p>
              <p className="h4 mb-2 text-body-emphasis">{unprocessedRow?.c ?? 0}</p>
              <Link href="/app/feedback?ai=pending" className="btn btn-sm btn-outline-primary">
                View unprocessed
              </Link>
            </div>
          </div>
        </div>
        </div>
      </section>

      <section aria-labelledby="dash-volume-heading">
        <h2 id="dash-volume-heading" className="h5 text-body-emphasis">
          Volume and mix
        </h2>
        <p className="small text-body-secondary mt-1 mb-3">
          Each row links to Feedback with that filter applied. Bars show share of the slice total.
        </p>
        <div className="row g-4">
          <div className="col-lg-6">
            <Breakdown
              title="By category"
              rows={categoryRows.map((r) => ({
                label: FEEDBACK_CATEGORY_LABELS[r.category] ?? `Category ${r.category}`,
                count: r.c,
                href: feedbackListHref({ category: String(r.category) }),
              }))}
            />
          </div>
          <div className="col-lg-6">
            <Breakdown
              title="By priority"
              rows={priorityRows.map((r) => ({
                label: FEEDBACK_PRIORITY_LABELS[r.priority] ?? `Priority ${r.priority}`,
                count: r.c,
                href: feedbackListHref({ priority: String(r.priority) }),
              }))}
            />
          </div>
          <div className="col-lg-6">
            <Breakdown
              title="By status"
              rows={statusRows.map((r) => ({
                label: FEEDBACK_STATUS_LABELS[r.status] ?? `Status ${r.status}`,
                count: r.c,
                href: feedbackListHref({ status: String(r.status) }),
              }))}
            />
          </div>
          <div className="col-lg-6">
            <Breakdown
              title="By source"
              rows={sourceRows.map((r) => ({
                label: FEEDBACK_SOURCE_LABELS[r.source] ?? `Source ${r.source}`,
                count: r.c,
                href: feedbackListHref({ source: String(r.source) }),
              }))}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="dash-recent-heading">
        <h2 id="dash-recent-heading" className="h5 text-body-emphasis mb-0">
          Recent activity
        </h2>
        <p className="small text-body-secondary mt-1 mb-3">Latest items and the most recent sent pulse.</p>
        <div className="row g-4">
        <div className="col-lg-7">
          <ul className="list-group shadow-sm border-secondary-subtle">
            {recentFeedback.length === 0 ? (
              <li className="list-group-item text-body-secondary small">No items yet.</li>
            ) : (
              recentFeedback.map((f) => (
                <li key={f.id} className="list-group-item p-0">
                  <Link
                    href={feedbackListHref({ detail: f.id })}
                    className="d-block p-3 text-decoration-none text-reset"
                  >
                    <span className="fw-medium text-primary">{f.title || "(no title)"}</span>
                    <p className="small text-body-secondary mb-0 mt-1">
                      {f.createdAt ? (
                        <time dateTime={f.createdAt.toISOString()} title={f.createdAt.toISOString()}>
                          {formatAppDateTime(f.createdAt)}
                        </time>
                      ) : null}
                    </p>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="col-lg-5">
          <div className="card h-100 shadow-sm border-secondary-subtle">
            <div className="card-body">
              <h3 className="h6 text-body-emphasis">Latest pulse report</h3>
              {latestPulse?.sentAt ? (
                <>
                  <p className="small text-body-secondary mb-2 mt-2">
                    Sent{" "}
                    <time dateTime={latestPulse.sentAt.toISOString()} title={latestPulse.sentAt.toISOString()}>
                      {formatAppDateTime(latestPulse.sentAt)}
                    </time>
                    {latestPulse.periodStart && latestPulse.periodEnd ? (
                      <>
                        <br />
                        <span className="text-body-tertiary">
                          Period: {formatAppDateTime(latestPulse.periodStart)} —{" "}
                          {formatAppDateTime(latestPulse.periodEnd)}
                        </span>
                      </>
                    ) : null}
                  </p>
                  <Link
                    href={pulseReportsListHref({ detail: latestPulse.id })}
                    className="btn btn-sm btn-primary"
                  >
                    Open report #{latestPulse.id}
                  </Link>
                </>
              ) : (
                <p className="small text-body-secondary mb-0 mt-2">No sent pulse reports yet.</p>
              )}
            </div>
          </div>
        </div>
        </div>
      </section>
    </PageShell>
  );
}

type BreakdownRow = { label: string; count: number; href: string };

function Breakdown({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  const sliceTotal = sorted.reduce((sum, r) => sum + r.count, 0) || 1;

  return (
    <div className="card h-100 shadow-sm border-secondary-subtle">
      <div className="card-body">
        <h3 className="h6 text-body-emphasis">{title}</h3>
        <ul className="list-unstyled small mb-0 mt-3">
          {sorted.length === 0 ? (
            <li className="text-body-tertiary">—</li>
          ) : (
            sorted.map((r) => {
              const pct = Math.round((r.count / sliceTotal) * 100);
              return (
                // `position-relative` + `stretched-link`: clicking the bar or label opens Feedback with that filter.
                <li key={`${r.label}-${r.href}`} className="mb-3 position-relative">
                  <div className="d-flex justify-content-between align-items-baseline gap-2">
                    <span className="text-truncate text-body">{r.label}</span>
                    <span className="fw-medium text-body flex-shrink-0 position-relative" style={{ zIndex: 1 }}>
                      {r.count}
                    </span>
                  </div>
                  <div
                    className="feedback-breakdown-bar rounded-pill mt-1 position-relative"
                    style={{ zIndex: 1 }}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${r.label}: ${pct}% of this group`}
                  >
                    <span
                      className="feedback-breakdown-bar__fill rounded-pill d-block"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <Link
                    href={r.href}
                    className="stretched-link"
                    aria-label={`${r.label}: open matching items in Feedback`}
                  />
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
