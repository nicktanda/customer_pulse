"use client";

/**
 * Insight cards on `/app/insights`: click anywhere on the card (except inner links) to open `?detail=id`.
 */
import Link from "next/link";
import type { MouseEvent } from "react";
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

/**
 * Returns the Bootstrap badge class for each insight *type* value.
 * Colours follow semantic conventions: problems are red/warning, positive signals are green, etc.
 */
function insightTypeBadgeClass(insightType: number): string {
  // 0=Problem, 1=Opportunity, 2=Trend, 3=Risk, 4=User need
  const map: Record<number, string> = {
    0: "text-bg-danger",
    1: "text-bg-success",
    2: "text-bg-info",
    3: "text-bg-warning",
    4: "text-bg-primary",
  };
  return map[insightType] ?? "text-bg-secondary";
}

/**
 * Returns the Bootstrap badge class for each insight *severity* value.
 * Higher severity = warmer/more alarming colour.
 */
function insightSeverityBadgeClass(severity: number): string {
  // 0=Informational, 1=Minor, 2=Moderate, 3=Major, 4=Critical
  const map: Record<number, string> = {
    0: "text-bg-secondary",
    1: "text-bg-secondary",
    2: "text-bg-warning",
    3: "text-bg-danger",
    4: "text-bg-danger",
  };
  return map[severity] ?? "text-bg-secondary";
}

/**
 * Returns the Bootstrap badge class for each insight *status* value.
 */
function insightStatusBadgeClass(status: number): string {
  // 0=Discovered, 1=Validated, 2=In progress, 3=Addressed, 4=Dismissed
  const map: Record<number, string> = {
    0: "text-bg-primary",
    1: "text-bg-success",
    2: "text-bg-info",
    3: "text-bg-secondary",
    4: "text-bg-secondary",
  };
  return map[status] ?? "text-bg-secondary";
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
          // col-md-6 makes cards sit two-per-row on medium+ screens
          <li key={row.id} className="col-md-6">
            <article
              tabIndex={0}
              className={`card border-secondary-subtle h-100 app-clickable-list-row${isSelected ? " app-list-row-selected" : ""}`}
              onClick={onClick}
              onKeyDown={onKeyDown}
            >
              {/* p-4 gives the card more breathing room than the default py-3 */}
              <div className="card-body p-4">
                <div className="d-flex flex-wrap gap-2 align-items-start justify-content-between">
                  {/* fw-semibold gives the title real visual weight */}
                  <h2 className="h6 mb-0 fw-semibold">
                    <Link href={href} className="link-primary text-decoration-none">
                      {row.title}
                    </Link>
                  </h2>
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <span className="small text-body-secondary text-nowrap">
                      {formatAppDateTime(when)}
                      {row.feedbackCount > 0 ? ` · ${row.feedbackCount} feedback` : null}
                    </span>
                    {/* Confidence pill badge — placed inline with the metadata line */}
                    {row.confidenceScore > 0 ? (
                      <span className="badge text-bg-primary" title="Confidence score">
                        {row.confidenceScore}%
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="small text-body-secondary mb-2 mt-2">{previewText(row.description)}</p>
                <div className="d-flex flex-wrap gap-1 align-items-center">
                  {/* Semantic badge colours: type, severity, status each get meaningful hues */}
                  <span className={`badge rounded-pill ${insightTypeBadgeClass(row.insightType)}`}>
                    {insightTypeLabel(row.insightType)}
                  </span>
                  <span className={`badge rounded-pill ${insightSeverityBadgeClass(row.severity)}`}>
                    {insightSeverityLabel(row.severity)}
                  </span>
                  <span className={`badge rounded-pill ${insightStatusBadgeClass(row.status)}`}>
                    {insightStatusLabel(row.status)}
                  </span>
                </div>

                {/*
                 * Quick "Create spec" action at the card footer.
                 * stopPropagation prevents the article's onClick (which opens the
                 * peek panel) from also firing when the user clicks this button.
                 */}
                <div
                  className="mt-3 pt-2 d-flex justify-content-end"
                  style={{ borderTop: "1px solid var(--bs-border-color-translucent)" }}
                >
                  <Link
                    href={`/app/build/specs/new?from_insight=${row.id}`}
                    className="btn btn-sm btn-outline-primary"
                    onClick={(e: MouseEvent) => e.stopPropagation()}
                  >
                    Create spec →
                  </Link>
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </>
  );
}
