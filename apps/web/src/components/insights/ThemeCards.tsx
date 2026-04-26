"use client";

/**
 * Trending theme cards for the Insights page.
 *
 * Each card links to the same page with `?theme=<id>` which opens the
 * theme peek drawer (handled by the parent server component).
 */

import Link from "next/link";
import { useDetailHrefNavigation } from "@/lib/use-detail-href-navigation";
import { formatAppDate } from "@/lib/format-app-date";

export type ThemeCardRow = {
  id: number;
  name: string;
  description: string | null;
  priorityScore: number;
  insightCount: number;
  affectedUsersEstimate: number;
  analyzedAt: Date | null;
  /** Top insight titles (up to 3), already ordered by relevance on the server. */
  topInsightTitles: string[];
  /** The URL to open when the card is clicked — same page + `?theme=<id>`. */
  detailHref: string;
};

/**
 * Returns a Bootstrap badge class based on the AI priority score (0–100).
 * Higher scores use warmer, more alarming colours.
 */
function priorityBadgeClass(score: number): string {
  if (score >= 75) return "text-bg-danger";
  if (score >= 50) return "text-bg-warning";
  if (score >= 25) return "text-bg-primary";
  return "text-bg-secondary";
}

/**
 * Turns a numeric priority score into a short human-readable label.
 */
function priorityLabel(score: number): string {
  if (score >= 75) return "Critical";
  if (score >= 50) return "High";
  if (score >= 25) return "Medium";
  return "Low";
}

const DESCRIPTION_LIMIT = 140;

function trimDescription(text: string | null): string {
  if (!text) return "";
  const t = text.trim();
  return t.length > DESCRIPTION_LIMIT ? `${t.slice(0, DESCRIPTION_LIMIT).trim()}…` : t;
}

export function ThemeCards({
  rows,
  selectedId,
}: {
  rows: ThemeCardRow[];
  selectedId: number | null;
}) {
  const handlersFor = useDetailHrefNavigation();

  return (
    <>
      {rows.map((row) => {
        const isSelected = selectedId === row.id;
        const { onClick, onKeyDown } = handlersFor(row.detailHref);

        return (
          // col-md-4 puts themes in a three-column layout on medium+ screens
          <li key={row.id} className="col-md-4">
            <article
              tabIndex={0}
              className={`card border-secondary-subtle h-100 app-clickable-list-row${isSelected ? " app-list-row-selected" : ""}`}
              onClick={onClick}
              onKeyDown={onKeyDown}
            >
              <div className="card-body p-3">
                {/* Top row: name + priority badge */}
                <div className="d-flex align-items-start gap-2 justify-content-between mb-1">
                  <h3 className="h6 mb-0 fw-semibold text-body-emphasis lh-sm">
                    <Link
                      href={row.detailHref}
                      className="link-primary text-decoration-none"
                    >
                      {row.name}
                    </Link>
                  </h3>
                  <span
                    className={`badge text-nowrap flex-shrink-0 ${priorityBadgeClass(row.priorityScore)}`}
                    title={`Priority score: ${row.priorityScore}/100`}
                  >
                    {priorityLabel(row.priorityScore)}
                  </span>
                </div>

                {/* Description */}
                {row.description ? (
                  <p className="small text-body-secondary mb-2 mt-1">
                    {trimDescription(row.description)}
                  </p>
                ) : null}

                {/* Stats row: insights count + affected users */}
                <div className="d-flex flex-wrap gap-3 small text-body-secondary mb-2">
                  {row.insightCount > 0 ? (
                    <span>{row.insightCount} insight{row.insightCount !== 1 ? "s" : ""}</span>
                  ) : null}
                  {row.affectedUsersEstimate > 0 ? (
                    <span>~{row.affectedUsersEstimate.toLocaleString()} users</span>
                  ) : null}
                  {row.analyzedAt ? (
                    <span className="ms-auto text-nowrap">
                      Updated {formatAppDate(row.analyzedAt)}
                    </span>
                  ) : null}
                </div>

                {/* Top insight title pills */}
                {row.topInsightTitles.length > 0 ? (
                  <ul className="list-unstyled d-flex flex-column gap-1 mb-0">
                    {row.topInsightTitles.map((title, i) => (
                      <li key={i} className="small text-body-secondary text-truncate">
                        <span className="text-body-tertiary me-1" aria-hidden>›</span>
                        {title}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </article>
          </li>
        );
      })}
    </>
  );
}
