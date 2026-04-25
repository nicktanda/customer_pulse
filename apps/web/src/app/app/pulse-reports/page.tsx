import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import {
  InlineAlert,
  PageHeader,
  PageShell,
  PaginationNav,
  PeekDrawerPanel,
  PeekPanelNotFound,
  ProjectAccessDenied,
  SimplePeekPanelHeader,
} from "@/components/ui";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { pulseReports } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser, getCurrentProjectSummaryForUser } from "@/lib/current-project";
import { formatAppDate, formatAppDateTime } from "@/lib/format-app-date";
import { userCanEditProject, userHasProjectAccess } from "@/lib/project-access";
import { enqueueSendDailyPulseAction } from "./actions";
import { pulseReportsListHref } from "@/lib/pulse-reports-list-query";
import { fetchPulseReportPageData } from "@/lib/pulse-report-page-data";
import { PulseReportDetailBody } from "@/components/pulse-reports/PulseReportDetailBody";
import { PulseReportListRows } from "@/components/pulse-reports/PulseReportListRows";
import { PulseJobPoller } from "@/components/pulse-reports/PulseJobPoller";

const PAGE_SIZE = 20;

export default async function PulseReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  const projectSummary = await getCurrentProjectSummaryForUser(userId);
  const sp = await searchParams;
  const notice = typeof sp.notice === "string" ? sp.notice : null;
  const err = typeof sp.error === "string" ? sp.error : null;
  const page = Math.max(1, Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const detailParsed = Number.parseInt(typeof sp.detail === "string" ? sp.detail : "", 10);
  const detailId = Number.isFinite(detailParsed) && detailParsed > 0 ? detailParsed : null;

  if (projectId == null) {
    return (
      <PageShell width="full">
        <PageHeader title="Pulse reports" description="Select a project first." />
      </PageShell>
    );
  }

  if (!(await userHasProjectAccess(userId, projectId))) {
    return <ProjectAccessDenied pageTitle="Pulse reports" />;
  }

  const canEdit = await userCanEditProject(userId, projectId);
  const db = await getRequestDb();
  const offset = (page - 1) * PAGE_SIZE;

  const [countRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(pulseReports)
    .where(eq(pulseReports.projectId, projectId));
  const total = countRow?.c ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const rows = await db
    .select()
    .from(pulseReports)
    .where(eq(pulseReports.projectId, projectId))
    .orderBy(desc(pulseReports.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset);

  const listState = {
    page: page > 1 ? page : undefined,
    detail: detailId ?? undefined,
  };

  const closePanelHref = pulseReportsListHref({ page: listState.page });
  const rowsForList = rows.map((r) => ({
    ...r,
    detailHref: pulseReportsListHref({ page: listState.page, detail: r.id }),
  }));
  const paginationBase = { detail: detailId ?? undefined };

  const prevHref =
    page > 1 ? pulseReportsListHref({ page: page - 1, ...paginationBase }) : null;
  const nextHref =
    page < totalPages ? pulseReportsListHref({ page: page + 1, ...paginationBase }) : null;

  let detailData = null as Awaited<ReturnType<typeof fetchPulseReportPageData>>;
  if (detailId != null) {
    detailData = await fetchPulseReportPageData(db, projectId, detailId);
  }

  return (
    <PageShell width="full">
      <PageHeader
        title="Pulse reports"
        description={
          <>
            Digest history for <span className="fw-medium">{projectSummary?.name ?? `Project #${projectId}`}</span>.{" "}
            <Link href="/app/recipients" className="link-primary">
              Email recipients
            </Link>{" "}
            choose who receives the daily message.{" "}
            {canEdit ? (
              <span className="text-body-secondary">
                &ldquo;Queue daily pulse&rdquo; sends to those recipients when the worker and mailer are configured.
              </span>
            ) : null}
          </>
        }
        actions={
          canEdit ? (
            <form action={enqueueSendDailyPulseAction} className="d-inline">
              <button type="submit" className="btn btn-primary btn-sm">
                Queue daily pulse
              </button>
            </form>
          ) : null
        }
      />

      {notice === "pulse" ? (
        <PulseJobPoller initialReportCount={total} />
      ) : null}
      {err === "nogithub" ? (
        <InlineAlert variant="danger" className="mt-3">
          Enable GitHub in Settings first.
        </InlineAlert>
      ) : null}
      {err === "prpending" ? (
        <InlineAlert variant="warning" className="mt-3">
          A PR is already pending or open for that idea.
        </InlineAlert>
      ) : null}

      <ul className="list-group shadow-sm mt-4">
        {rows.length === 0 ? (
          <li className="list-group-item text-body-secondary small">No reports yet.</li>
        ) : (
          <PulseReportListRows rows={rowsForList} selectedId={detailData?.row.id ?? null} />
        )}
      </ul>

      <PaginationNav
        className="mt-3"
        prevHref={prevHref}
        nextHref={nextHref}
        status={`Page ${page} of ${totalPages}`}
      />

      {detailId != null ? (
        <>
          <Link href={closePanelHref} className="peek-drawer-backdrop" aria-label="Close detail panel" />
          <PeekDrawerPanel storageKey="pulse-reports-drawer-width">
            {detailData != null ? (
              <>
                <SimplePeekPanelHeader
                  closeHref={closePanelHref}
                  fullPageHref={`/app/pulse-reports/${detailData.row.id}`}
                  entityId={detailData.row.id}
                  title={
                    <>
                      {formatAppDate(detailData.row.periodStart)} – {formatAppDate(detailData.row.periodEnd)}
                    </>
                  }
                  subtitle={
                    detailData.row.sentAt ? (
                      <>Sent {formatAppDateTime(detailData.row.sentAt)}</>
                    ) : (
                      "Not sent yet"
                    )
                  }
                  entityLinkTitle={`Open pulse report #${detailData.row.id} on its own page`}
                />
                <PulseReportDetailBody
                  data={detailData}
                  canEdit={canEdit}
                  notice={null}
                  err={null}
                  variant="panel"
                />
              </>
            ) : (
              <PeekPanelNotFound
                message="No report found for this id in the current project."
                closeHref={closePanelHref}
              />
            )}
          </PeekDrawerPanel>
        </>
      ) : null}
    </PageShell>
  );
}
