"use client";

/**
 * Integration list: entire row opens `?detail=id` (title link still works for middle-click).
 */
import Link from "next/link";
import { INTEGRATION_SOURCE_LABELS } from "@/lib/integration-source-meta";
import { formatAppDateTime } from "@/lib/format-app-date";
import { useDetailHrefNavigation } from "@/lib/use-detail-href-navigation";

export type IntegrationListRow = {
  id: number;
  name: string;
  sourceType: number;
  enabled: boolean;
  lastSyncedAt: Date | null;
  /** Built on the server — Client Components cannot receive function props from Server Components. */
  detailHref: string;
};

export function IntegrationListRows({
  rows,
  selectedId,
}: {
  rows: IntegrationListRow[];
  selectedId: number | null;
}) {
  const handlersFor = useDetailHrefNavigation();

  return (
    <>
      {rows.map((r) => {
        const href = r.detailHref;
        const isSelected = selectedId === r.id;
        const { onClick, onKeyDown } = handlersFor(href);
        return (
          <li
            key={r.id}
            tabIndex={0}
            className={`list-group-item d-flex flex-wrap align-items-center justify-content-between gap-2 app-clickable-list-row${isSelected ? " app-list-row-selected" : ""}`}
            onClick={onClick}
            onKeyDown={onKeyDown}
          >
            <div>
              <Link href={href} className="fw-medium link-primary text-decoration-none">
                {r.name}
              </Link>
              <p className="small text-body-secondary mb-0">
                {INTEGRATION_SOURCE_LABELS[r.sourceType] ?? `type ${r.sourceType}`} ·{" "}
                {r.enabled ? "enabled" : "disabled"}
                {r.lastSyncedAt ? ` · last sync ${formatAppDateTime(r.lastSyncedAt)}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </>
  );
}
