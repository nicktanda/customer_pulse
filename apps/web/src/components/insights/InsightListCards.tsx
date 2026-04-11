"use client";

/**
 * Insight cards on `/app/insights`: click anywhere on the card (except inner links) to open `?detail=id`.
 */
import Link from "next/link";
import { formatAppDateTime } from "@/lib/format-app-date";
import { useDetailHrefNavigation } from "@/lib/use-detail-href-navigation";
import {
  insightSeverityLabel,
  insightStatusLabel,
  insightTypeLabel,
} from "@/lib/insight-enums-display";

export type InsightCardRow = {
  id: number;
  title: string;
  description: string;
  insightType: number;
  severity: number;
  status: number;
  feedbackCount: number;
  confidenceScore: number;
  discoveredAt: Date | null;
  createdAt: Date;
  /**
   * Link for this card (same list page + `?detail=id`). Built on the server because Client Components
   * cannot receive plain functions from Server Components — only serializable data like strings.
   */
  detailHref: string;
};

const DESCRIPTION_PREVIEW = 220;

function previewText(text: string): string {
  const t = text.trim();
  if (t.length <= DESCRIPTION_PREVIEW) return t;
  return `${t.slice(0, DESCRIPTION_PREVIEW).trim()}…`;
}

export function InsightListCards({
  rows,
  selectedId,
}: {
  rows: InsightCardRow[];
  selectedId: number | null;
}) {
  const handlersFor = useDetailHrefNavigation();

  return (
    <>
      {rows.map((row) => {
        const when = row.discoveredAt ?? row.createdAt;
        const href = row.detailHref;
        const isSelected = selectedId === row.id;
        const { onClick, onKeyDown } = handlersFor(href);
        return (
          <li key={row.id}>
            <article
              tabIndex={0}
              className={`card border-secondary-subtle h-100 app-clickable-list-row${isSelected ? " app-list-row-selected" : ""}`}
              onClick={onClick}
              onKeyDown={onKeyDown}
            >
              <div className="card-body py-3">
                <div className="d-flex flex-wrap gap-2 align-items-start justify-content-between">
                  <h2 className="h6 mb-0">
                    <Link href={href} className="link-primary text-decoration-none">
                      {row.title}
                    </Link>
                  </h2>
                  <span className="small text-body-secondary text-nowrap">
                    {formatAppDateTime(when)}
                    {row.feedbackCount > 0 ? ` · ${row.feedbackCount} feedback` : null}
                  </span>
                </div>
                <p className="small text-body-secondary mb-2 mt-2">{previewText(row.description)}</p>
                <div className="d-flex flex-wrap gap-1 align-items-center">
                  <span className="badge rounded-pill text-bg-light border">{insightTypeLabel(row.insightType)}</span>
                  <span className="badge rounded-pill text-bg-light border">
                    {insightSeverityLabel(row.severity)}
                  </span>
                  <span className="badge rounded-pill text-bg-light border">{insightStatusLabel(row.status)}</span>
                  {row.confidenceScore > 0 ? (
                    <span className="small text-body-secondary ms-1">Confidence {row.confidenceScore}%</span>
                  ) : null}
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </>
  );
}
