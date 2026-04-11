import type { ReactNode } from "react";
import { PeekPanelToolbar, type PeekPanelToolbarProps } from "./PeekPanelToolbar";

export type PeekPanelHeaderProps = PeekPanelToolbarProps & {
  /** Title block below the toolbar (id line, headings, meta). */
  children: ReactNode;
};

/**
 * Shared chrome for list + side-peek pages: Notion-style toolbar, then your headings / meta.
 */
export function PeekPanelHeader({
  children,
  className,
  closeHref,
  fullPageHref,
  prevHref,
  nextHref,
  adjacentNavLabels,
}: PeekPanelHeaderProps) {
  return (
    <header className="peek-panel-header">
      <PeekPanelToolbar
        closeHref={closeHref}
        fullPageHref={fullPageHref}
        prevHref={prevHref}
        nextHref={nextHref}
        adjacentNavLabels={adjacentNavLabels}
        className={className}
      />
      <div className="peek-panel-header__main min-w-0">{children}</div>
    </header>
  );
}
