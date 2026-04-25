import Link from "next/link";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  PageHeader,
  PageShell,
  PaginationNav,
  PeekPanelNotFound,
  PeekDrawerPanel,
  ProjectAccessDenied,
  SimplePeekPanelHeader,
  IconPeekClose,
} from "@/components/ui";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { feedbackInsights, feedbacks, insights, themes, insightThemes } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser, getCurrentProjectSummaryForUser } from "@/lib/current-project";
import { userHasProjectAccess } from "@/lib/project-access";
import { insightsListHref } from "@/lib/insights-list-query";
import { InsightDetailBody, type LinkedFeedbackItem } from "@/components/insights/InsightDetailBody";
import { InsightListCards } from "@/components/insights/InsightListCards";
import { TrendingThemesSection } from "@/components/insights/TrendingThemesSection";
import {
  insightTypeLabel,
  insightSeverityLabel,
  insightStatusLabel,
} from "@/lib/insight-enums-display";
import { formatAppDate } from "@/lib/format-app-date";

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
  // ?theme=<id> opens the theme peek drawer (Trending Themes section below the grid).
  const themeParsed = Number.parseInt(typeof sp.theme === "string" ? sp.theme : "", 10);
  const themeId = Number.isFinite(themeParsed) && themeParsed > 0 ? themeParsed : null;

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

  // Build the close-theme href: same page, same pagination, but without ?theme=.
  const closeThemeHref = insightsListHref({ page: page > 1 ? page : undefined });

  // Fetch the selected theme row + its linked insights for the peek drawer.
  let themeRow: (typeof themes.$inferSelect) | null = null;
  type ThemeLinkedInsight = { id: number; title: string; insightType: number; severity: number; status: number; relevanceScore: number };
  let themeLinkedInsights: ThemeLinkedInsight[] = [];
  if (themeId != null) {
    const [full] = await db
      .select()
      .from(themes)
      .where(and(eq(themes.id, themeId), eq(themes.projectId, projectId)))
      .limit(1);
    if (full) {
      themeRow = full;
      themeLinkedInsights = await db
        .select({
          id: insights.id,
          title: insights.title,
          insightType: insights.insightType,
          severity: insights.severity,
          status: insights.status,
          relevanceScore: insightThemes.relevanceScore,
        })
        .from(insightThemes)
        .innerJoin(insights, eq(insightThemes.insightId, insights.id))
        .where(and(eq(insightThemes.themeId, themeId), eq(insights.projectId, projectId)))
        .orderBy(desc(insightThemes.relevanceScore));
    }
  }

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

      {/* row g-3 activates the Bootstrap grid so InsightListCards' col-md-6 items sit two-per-row */}
      <ul className="row g-3 list-unstyled mt-4 mb-0">
        {rows.length === 0 ? (
          <li className="col-12 card border-secondary-subtle">
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

      {/* ── Trending Themes ──────────────────────────────────────────────── */}
      {/* Rendered below the insights grid. The server component does its own
          DB query so this section doesn't slow down the insight list above. */}
      <TrendingThemesSection
        projectId={projectId}
        currentPage={page > 1 ? page : undefined}
        selectedThemeId={themeId}
      />

      {/* ── Insight detail peek drawer ────────────────────────────────────── */}
      {detailId != null ? (
        <>
          {/*
           * Semi-transparent backdrop — clicking anywhere outside the drawer
           * navigates back to the list (closes the panel). No JS needed.
           */}
          <Link
            href={closePanelHref}
            className="peek-drawer-backdrop"
            aria-label="Close detail panel"
          />

          <PeekDrawerPanel storageKey="insights-drawer-width">
            {detailRow != null ? (
              <>
                <SimplePeekPanelHeader
                  closeHref={closePanelHref}
                  fullPageHref={`/app/learn/insights/${detailRow.id}`}
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
          </PeekDrawerPanel>
        </>
      ) : null}

      {/* ── Theme peek drawer ─────────────────────────────────────────────── */}
      {themeId != null ? (
        <>
          <Link
            href={closeThemeHref}
            className="peek-drawer-backdrop"
            aria-label="Close theme panel"
          />

          <PeekDrawerPanel storageKey="insights-theme-drawer-width">
            {themeRow != null ? (
              <>
                {/* Themes have no standalone full-page, so we use a minimal header with just a close button */}
                <header className="peek-panel-header">
                  <div
                    className="d-flex align-items-center flex-wrap peek-panel-toolbar"
                    role="toolbar"
                    aria-label="Panel controls"
                  >
                    <Link
                      href={closeThemeHref}
                      className="peek-panel-icon-btn"
                      aria-label="Close panel"
                      title="Close panel"
                    >
                      <IconPeekClose />
                    </Link>
                  </div>
                  <div className="peek-panel-header__main min-w-0">
                    <p className="small text-body-secondary mb-1">Trending theme</p>
                    <h2 className="h5 text-body-emphasis mb-0 text-break peek-panel-title">
                      {themeRow.name}
                    </h2>
                    {themeRow.analyzedAt ? (
                      <p className="small text-body-secondary mb-0 mt-1">
                        Last updated {formatAppDate(themeRow.analyzedAt)}
                      </p>
                    ) : null}
                  </div>
                </header>

                <div className="mt-3">
                  {/* Theme description */}
                  {themeRow.description ? (
                    <section className="mb-4">
                      <p className="small">{themeRow.description}</p>
                    </section>
                  ) : null}

                  {/* Quick stats */}
                  <div className="d-flex flex-wrap gap-3 small text-body-secondary mb-4">
                    {themeRow.insightCount > 0 ? (
                      <span>
                        <strong className="text-body-emphasis">{themeRow.insightCount}</strong>{" "}
                        insight{themeRow.insightCount !== 1 ? "s" : ""}
                      </span>
                    ) : null}
                    {themeRow.affectedUsersEstimate > 0 ? (
                      <span>
                        ~<strong className="text-body-emphasis">{themeRow.affectedUsersEstimate.toLocaleString()}</strong>{" "}
                        users affected
                      </span>
                    ) : null}
                    {themeRow.priorityScore > 0 ? (
                      <span>
                        Priority score:{" "}
                        <strong className="text-body-emphasis">{themeRow.priorityScore}/100</strong>
                      </span>
                    ) : null}
                  </div>

                  {/* Linked insights list */}
                  <section>
                    <h3 className="small fw-semibold text-body-secondary text-uppercase letter-spacing-wide mb-2">
                      Linked insights ({themeLinkedInsights.length})
                    </h3>

                    {themeLinkedInsights.length === 0 ? (
                      <p className="small text-body-secondary">No insights linked to this theme.</p>
                    ) : (
                      <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
                        {themeLinkedInsights.map((ins) => (
                          <li key={ins.id}>
                            <Link
                              href={insightsListHref({ page: page > 1 ? page : undefined, detail: ins.id })}
                              className="d-block text-decoration-none p-2 rounded border border-secondary-subtle"
                            >
                              <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                                <span className="small fw-medium text-body-emphasis lh-sm">
                                  {ins.title}
                                </span>
                              </div>
                              <div className="d-flex flex-wrap gap-1">
                                <span className="badge rounded-pill text-bg-light border" style={{ fontSize: "0.7rem" }}>
                                  {insightTypeLabel(ins.insightType)}
                                </span>
                                <span className="badge rounded-pill text-bg-light border" style={{ fontSize: "0.7rem" }}>
                                  {insightSeverityLabel(ins.severity)}
                                </span>
                                <span className="badge rounded-pill text-bg-light border" style={{ fontSize: "0.7rem" }}>
                                  {insightStatusLabel(ins.status)}
                                </span>
                                {ins.relevanceScore > 0 ? (
                                  <span className="ms-auto small text-body-secondary text-nowrap">
                                    {Math.round(ins.relevanceScore * 100)}% relevance
                                  </span>
                                ) : null}
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              </>
            ) : (
              <PeekPanelNotFound
                message="No theme found for this id in the current project."
                closeHref={closeThemeHref}
              />
            )}
          </PeekDrawerPanel>
        </>
      ) : null}
    </PageShell>
  );
}
