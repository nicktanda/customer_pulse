import Link from "next/link";
import type { ReactNode } from "react";

type MetricTileProps = {
  label: string;
  value: number;
  /** When set, the whole tile is wrapped in a link (e.g. dashboard “Unprocessed” → Feedback). */
  href?: string;
  /** Shown under the value when `href` is set so the tile reads as clickable. */
  linkHint?: string;
  /** Bootstrap column classes around the tile (default matches dashboard / project stat grids). */
  columnClassName?: string;
  /** Extra classes on the `.card` (default matches existing stat cards). */
  cardClassName?: string;
};

/**
 * Single KPI block: uppercase label, large number, optional linked affordance.
 */
export function MetricTile({
  label,
  value,
  href,
  linkHint,
  columnClassName = "col-sm-6 col-xl-3",
  cardClassName = "h-100 shadow-sm border-secondary-subtle",
}: MetricTileProps) {
  const body: ReactNode = (
    <div className="card-body">
      <p className="small fw-medium text-uppercase text-body-secondary mb-1">{label}</p>
      <p className="h4 mb-0 text-body-emphasis">{value}</p>
      {href && linkHint ? (
        <p className="small text-primary mb-0 mt-2 text-decoration-underline">{linkHint}</p>
      ) : null}
    </div>
  );

  const card = <div className={`card ${cardClassName}`.trim()}>{body}</div>;

  return (
    <div className={columnClassName}>
      {href ? (
        <Link
          href={href}
          className="text-decoration-none text-reset d-block h-100 feedback-stat-card-link rounded"
        >
          {card}
        </Link>
      ) : (
        card
      )}
    </div>
  );
}
