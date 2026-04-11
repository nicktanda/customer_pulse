import type { ReactNode } from "react";

/**
 * Right-hand master–detail panel: pins to the top of the scrollable **main** pane on large screens
 * (see `.app-main-pane` in layout), not the viewport — matches Notion “side peek” behavior.
 */
export function StickyDetailAside({
  "aria-label": ariaLabel,
  children,
}: {
  "aria-label": string;
  children: ReactNode;
}) {
  return (
    <aside
      className="col-12 col-lg-5 col-xl-4 border-lg-start border-secondary-subtle ps-3 pe-3 ps-lg-4 pe-lg-4 pt-3 pt-lg-0 app-detail-aside"
      aria-label={ariaLabel}
    >
      <div className="app-detail-aside__scroll">{children}</div>
    </aside>
  );
}
