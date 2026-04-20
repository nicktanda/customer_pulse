import Link from "next/link";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  PageHeader,
  PageShell,
  PaginationNav,
  PeekPanelNotFound,
  ProjectAccessDenied,
  SimplePeekPanelHeader,
  StickyDetailAside,
} from "@/components/ui";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { feedbackInsights, feedbacks, insights } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser, getCurrentProjectSummaryForUser } from "@/lib/current-project";
import { userHasProjectAccess } from "@/lib/project-access";
import { insightsListHref } from "@/lib/insights-list-query";
import { InsightDetailBody, type LinkedFeedbackItem } from "@/components/insights/InsightDetailBody";
import { InsightListCards } from "@/components/insights/InsightListCards";

/** How many insight cards we show per page (same ballpark as Feedback). */
const PAGE_SIZE = 20;

/**
 * Lists AI-generated insights for the current project (rows in `insights`), newest first.
 * Optional `?detail=` opens the same content as `/app/insights/[id]` in a right-hand panel.
 */
export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  const projectSummary = await getCurrentProjectSummaryForUser(userId);
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const detailParsed = Number.parseInt(typeof sp.detail === "string" ? sp.detail : "", 10);
  const detailId = Number.isFinite(detailParsed) && detailParsed > 0 ? detailParsed : null;

  if (projectId == null) {
    return (
      <PageShell width="full">
        <PageHeader
          title="Insights"
          description="Select an active project under Settings to see AI-generated insights from your feedback."
        />
      </PageShell>
    );
  }

  if (!(await userHasProjectAccess(userId, projectId))) {
    return <ProjectAccessDenied pageTitle="Insights" />;
  }

  const db = await getRequestDb();
  const offset = (page - 1) * PAGE_SIZE;

  const [countRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(insights)
    .where(eq(insights.projectId, projectId));
  const total = countRow?.c ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const sortKey = sql`coalesce(${insights.discoveredAt}, ${insights.createdAt})`;

  const rows = await db
    .select({
      id: insights.id,
      title: insights.title,
      description: insights.description,
      insightType: insights.insightType,
      severity: insights.severity,
      status: insights.status,
      feedbackCount: insights.feedbackCount,
      confidenceScore: insights.confidenceScore,
      discoveredAt: insights.discoveredAt,
      createdAt: insights.createdAt,
    })
    .from(insights)
    .where(eq(insights.projectId, projectId))
    .orderBy(desc(sortKey))
    .limit(PAGE_SIZE)
    .offset(offset);

  const listState = {
    page: page > 1 ? page : undefined,
    detail: detailId ?? undefined,
  };

  const closePanelHref = insightsListHref({ page: listState.page });
  // Each row carries its own `detailHref` so we never pass a function into `InsightListCards` (a Client Component).
  const rowsForCards = rows.map((r) => ({
    ...r,
    detailHref: insightsListHref({ page: listState.page, detail: r.id }),
  }));
  const paginationBase = { detail: detailId ?? undefined };

  let detailRow: (typeof insights.$inferSelect) | null = null;
  let linkedFeedback: LinkedFeedbackItem[] = [];
  if (detailId != null) {
    const [full] = await db
      .select()
      .from(insights)
      .where(and(eq(insights.id, detailId), eq(insights.projectId, projectId)))
      .limit(1);
    if (full) {
      detailRow = full;
      linkedFeedback = await db
        .select({
          feedbackId: feedbacks.id,
          title: feedbacks.title,
          relevanceScore: feedbackInsights.relevanceScore,
          contributionSummary: feedbackInsights.contributionSummary,
        })
        .from(feedbackInsights)
        .innerJoin(feedbacks, eq(feedbackInsights.feedbackId, feedbacks.id))
        .where(and(eq(feedbackInsights.insightId, detailId), eq(feedbacks.projectId, projectId)))
        .orderBy(asc(feedbacks.id));
    }
  }

  const prevHref =
    page > 1 ? insightsListHref({ page: page - 1, ...paginationBase }) : null;
  const nextHref =
    page < totalPages ? insightsListHref({ page: page + 1, ...paginationBase }) : null;

  const listColClass =
    detailRow != null || detailId != null ? "col-12 col-lg-7 col-xl-8" : "col-12";

  return (
    <PageShell width="full">
      <PageHeader
        title="Insights"
        description={
          <>
            Patterns and themes inferred from feedback in{" "}
            <span className="fw-medium">{projectSummary?.name ?? `Project #${projectId}`}</span>. Click a card for
            detail on the right — or open the full page. See{" "}
            <Link href="/app/reporting" className="link-primary">
              Reporting
            </Link>{" "}
            for analytics in a date range.
          </>
        }
      />

      <div className="row g-3 align-items-start mt-4">
        <div className={listColClass}>
          <ul className="list-unstyled mb-0 d-flex flex-column gap-3">
            {rows.length === 0 ? (
              <li className="card border-secondary-subtle">
                <div className="card-body py-4 text-body-secondary small">
                  <p className="mb-2">No insights yet for this project.</p>
                  <p className="mb-0">
                    Once the worker runs insight discovery against your feedback, entries will appear here. Until then,
                    keep ingesting feedback via{" "}
                    <Link href="/app/integrations" className="link-primary">
                      Integrations
                    </Link>{" "}
                    or the API.
                  </p>
                </div>
              </li>
            ) : (
              <InsightListCards rows={rowsForCards} selectedId={detailRow?.id ?? null} />
            )}
          </ul>

          {total > PAGE_SIZE ? (
            <PaginationNav
              className="mt-4"
              prevHref={prevHref}
              nextHref={nextHref}
              status={`Page ${page} of ${totalPages}`}
            />
          ) : null}
        </div>

        {detailId != null ? (
          <StickyDetailAside aria-label="Insight detail">
            {detailRow != null ? (
              <>
                <SimplePeekPanelHeader
                  closeHref={closePanelHref}
                  fullPageHref={`/app/insights/${detailRow.id}`}
                  entityId={detailRow.id}
                  title={detailRow.title}
                  entityLinkTitle={`Open insight #${detailRow.id} on its own page`}
                />
                <InsightDetailBody row={detailRow} linkedFeedback={linkedFeedback} />
              </>
            ) : (
              <PeekPanelNotFound
                message="No insight found for this id in the current project."
                closeHref={closePanelHref}
              />
            )}
          </StickyDetailAside>
        ) : null}
      </div>
    </PageShell>
  );
}
