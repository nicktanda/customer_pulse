"use client";

/**
 * Pulse report list rows: click the row (not only the title) to open `?detail=id`.
 */
import Link from "next/link";
import { formatAppDate, formatAppDateTime } from "@/lib/format-app-date";
import { useDetailHrefNavigation } from "@/lib/use-detail-href-navigation";

export type PulseReportListRow = {
  id: number;
  periodStart: Date;
  periodEnd: Date;
  feedbackCount: number;
  sentAt: Date | null;
  /** Built on the server — Client Components cannot receive function props from Server Components. */
  detailHref: string;
};

export function PulseReportListRows({
  rows,
  selectedId,
}: {
  rows: PulseReportListRow[];
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
            className={`list-group-item app-clickable-list-row${isSelected ? " app-list-row-selected" : ""}`}
            onClick={onClick}
            onKeyDown={onKeyDown}
          >
            <Link href={href} className="fw-medium link-primary text-decoration-none">
              {formatAppDate(r.periodStart)} – {formatAppDate(r.periodEnd)}
            </Link>
            <p className="small text-body-secondary mb-0 mt-1">
              #{r.id} · {r.feedbackCount} feedback ·{" "}
              {r.sentAt ? <>sent {formatAppDateTime(r.sentAt)}</> : "not sent"}
            </p>
          </li>
        );
      })}
    </>
  );
}
