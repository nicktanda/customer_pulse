/**
 * Kairos product wordmark — mirrors the brand kit (wide geometric caps + electric-cyan tagline).
 *
 * Why a tiny component: the same block appears on auth screens, the app sidebar, etc. Changing
 * spelling or tagline once updates every surface.
 *
 * Works in Server **and** Client Components (no React state / effects here).
 */
export function KairosWordmark({
  /** When true, only the logotype line (for narrow sidebar chrome). */
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      {/* `text-uppercase` renders “KAIROS” from the source word “Kairos” (easier to grep the codebase). */}
      <p
        className={`kairos-wordmark mb-0 text-uppercase ${compact ? "small" : "fs-6"}`}
        style={{ letterSpacing: "0.14em" }}
      >
        Kairos
      </p>
      {!compact ? (
        <p className="kairos-tagline small mb-0 mt-1">Decide. Act. Accelerate.</p>
      ) : null}
    </div>
  );
}
