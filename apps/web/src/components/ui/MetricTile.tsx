import Link from "next/link";
import type { ReactNode } from "react";

type MetricTileProps = {
  label: string;
  value: number;
  /** When set, the whole tile is wrapped in a link (e.g. dashboard "Unprocessed" → Feedback). */
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
 * Has a subtle ember accent on the left border so tiles feel like deliberate data points.
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
    <div className="card-body" style={{ paddingLeft: "1.1rem" }}>
      {/* Label: small-caps style — uppercase, wide tracking, muted colour */}
      <p
        className="fw-medium text-uppercase text-body-secondary mb-2"
        style={{ fontSize: "0.6875rem", letterSpacing: "0.08em" }}
      >
        {label}
      </p>
      {/* Number: larger and heavier so it reads as a KPI at a glance */}
      <p className="mb-0 text-body-emphasis" style={{ fontSize: "1.875rem", fontWeight: 700, lineHeight: 1.1 }}>
        {value.toLocaleString()}
      </p>
      {href && linkHint ? (
        <p className="small text-primary mb-0 mt-2" style={{ fontSize: "0.75rem" }}>
          {linkHint} →
        </p>
      ) : null}
    </div>
  );

  /*
   * The left-border accent uses an inline style so it reads as a deliberate design choice
   * rather than a Bootstrap utility — it picks up the ember primary token.
   */
  const card = (
    <div
      className={`card ${cardClassName}`.trim()}
      style={{
        borderLeft: "3px solid var(--bs-primary)",
        borderTopLeftRadius: "var(--bs-border-radius)",
        borderBottomLeftRadius: "var(--bs-border-radius)",
        transition: "box-shadow 0.15s ease",
      }}
    >
      {body}
    </div>
  );

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
