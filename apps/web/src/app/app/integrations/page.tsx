import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { integrations } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject, userHasProjectAccess } from "@/lib/project-access";
import { syncAllIntegrationsAction } from "./actions";
import {
  InlineAlert,
  PageHeader,
  PageShell,
  PeekPanelNotFound,
  ProjectAccessDenied,
  SimplePeekPanelHeader,
  StickyDetailAside,
} from "@/components/ui";
import { integrationsListHref } from "@/lib/integrations-list-query";
import { INTEGRATION_SOURCE_LABELS } from "@/lib/integration-source-meta";
import { IntegrationDetailPanel } from "@/components/integrations/IntegrationDetailPanel";
import { IntegrationListRows } from "@/components/integrations/IntegrationListRows";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  const sp = await searchParams;
  const notice = typeof sp.notice === "string" ? sp.notice : null;
  const detailParsed = Number.parseInt(typeof sp.detail === "string" ? sp.detail : "", 10);
  const detailId = Number.isFinite(detailParsed) && detailParsed > 0 ? detailParsed : null;

  if (projectId == null) {
    return (
      <PageShell width="full">
        <PageHeader title="Integrations" description="Select or create a project first." />
      </PageShell>
    );
  }

  if (!(await userHasProjectAccess(userId, projectId))) {
    return <ProjectAccessDenied pageTitle="Integrations" />;
  }

  const canEdit = await userCanEditProject(userId, projectId);
  const db = await getRequestDb();
  const rows = await db
    .select()
    .from(integrations)
    .where(eq(integrations.projectId, projectId))
    .orderBy(asc(integrations.name));

  const closePanelHref = integrationsListHref({ ...(notice ? { notice } : {}) });
  const rowsForList = rows.map((r) => ({
    ...r,
    detailHref: integrationsListHref({ ...(notice ? { notice } : {}), detail: r.id }),
  }));

  let detailRow: (typeof integrations.$inferSelect) | null = null;
  if (detailId != null) {
    const [r] = await db.select().from(integrations).where(eq(integrations.id, detailId)).limit(1);
    if (r && r.projectId === projectId) {
      detailRow = r;
    }
  }

  const listColClass =
    detailRow != null || detailId != null ? "col-12 col-lg-7 col-xl-8" : "col-12";

  return (
    <PageShell width="full">
      <PageHeader
        title="Integrations"
        description="Connect Linear, Slack, Jira, and other sources. Credentials are encrypted at rest on the server."
        actions={
          canEdit ? (
            <>
              <Link href="/app/integrations/new" className="btn btn-primary btn-sm">
                New integration
              </Link>
              <form action={syncAllIntegrationsAction} className="d-inline">
                <button type="submit" className="btn btn-outline-secondary btn-sm">
                  Sync all (enqueue)
                </button>
              </form>
            </>
          ) : null
        }
      />

      {notice === "syncall" ? (
        <InlineAlert variant="success">
          Sync jobs were queued for enabled integrations. New feedback usually appears within a few minutes once the
          background worker and Redis are running.
        </InlineAlert>
      ) : null}

      <div className="row g-3 align-items-start mt-4">
        <div className={listColClass}>
          <ul className="list-group shadow-sm">
            {rows.length === 0 ? (
              <li className="list-group-item text-body-secondary small">No integrations yet.</li>
            ) : (
              <IntegrationListRows rows={rowsForList} selectedId={detailRow?.id ?? null} />
            )}
          </ul>
        </div>

        {detailId != null ? (
          <StickyDetailAside aria-label="Integration detail">
            {detailRow != null ? (
              <>
                <SimplePeekPanelHeader
                  closeHref={closePanelHref}
                  fullPageHref={`/app/integrations/${detailRow.id}`}
                  entityId={detailRow.id}
                  title={detailRow.name}
                  subtitle={
                    INTEGRATION_SOURCE_LABELS[detailRow.sourceType] ?? `type ${detailRow.sourceType}`
                  }
                  entityLinkTitle={`Open integration #${detailRow.id} on its own page`}
                />
                <IntegrationDetailPanel row={detailRow} canEdit={canEdit} notice={null} />
              </>
            ) : (
              <PeekPanelNotFound
                message="No integration found for this id in the current project."
                closeHref={closePanelHref}
              />
            )}
          </StickyDetailAside>
        ) : null}
      </div>
    </PageShell>
  );
}
