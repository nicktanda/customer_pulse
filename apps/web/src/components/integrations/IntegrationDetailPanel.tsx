import Link from "next/link";
import { InlineAlert } from "@/components/ui";
import { DeleteIntegrationButton } from "@/app/app/integrations/DeleteIntegrationButton";
import { syncIntegrationNowAction } from "@/app/app/integrations/actions";
import { INTEGRATION_SOURCE_LABELS } from "@/lib/integration-source-meta";
import { integrations } from "@customer-pulse/db/client";

export type IntegrationRow = typeof integrations.$inferSelect;

/**
 * Integration metadata and actions (sync, delete, edit link).
 * Used on `/app/integrations/[id]` and the integrations list `?detail=` panel.
 */
export function IntegrationDetailPanel({
  row,
  canEdit,
  notice,
}: {
  row: IntegrationRow;
  canEdit: boolean;
  notice: string | null;
}) {
  const id = row.id;

  return (
    <>
      {notice === "sync" ? <InlineAlert variant="success">Sync job queued.</InlineAlert> : null}

      <dl className="mt-4 small">
        <div className="mb-2">
          <dt className="text-body-secondary">Enabled</dt>
          <dd className="mb-0">{row.enabled ? "yes" : "no"}</dd>
        </div>
        <div className="mb-2">
          <dt className="text-body-secondary">Last synced</dt>
          <dd className="mb-0">{row.lastSyncedAt?.toISOString() ?? "—"}</dd>
        </div>
        <div className="mb-0">
          <dt className="text-body-secondary">Webhook secret</dt>
          <dd className="mb-0">{row.webhookSecret ? "•••• (set)" : "—"}</dd>
        </div>
      </dl>

      {canEdit ? (
        <div className="d-flex flex-wrap gap-2 align-items-center mt-4">
          <Link href={`/app/integrations/${id}/edit`} className="btn btn-outline-secondary btn-sm">
            Edit
          </Link>
          <form action={syncIntegrationNowAction.bind(null, id)} className="d-inline">
            <button type="submit" className="btn btn-primary btn-sm">
              Sync now
            </button>
          </form>
          <DeleteIntegrationButton integrationId={id} />
        </div>
      ) : null}

      <p className="small text-body-tertiary mt-3 mb-0">
        {INTEGRATION_SOURCE_LABELS[row.sourceType] ?? `type ${row.sourceType}`} · #{row.id}
      </p>
    </>
  );
}
