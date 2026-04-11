import Link from "next/link";
import {
  IconPeekChevronDown,
  IconPeekChevronUp,
  IconPeekClose,
  IconPeekOpenFull,
} from "./PeekPanelIcons";

/** Default screen-reader + tooltip copy for ↑↓ when adjacent navigation is shown. */
export type PeekAdjacentNavLabels = {
  prev: string;
  next: string;
  noPrev: string;
  noNext: string;
};

const defaultAdjacentNavLabels: PeekAdjacentNavLabels = {
  prev: "Previous item",
  next: "Next item",
  noPrev: "No previous item",
  noNext: "No next item",
};

export type PeekPanelToolbarProps = {
  closeHref: string;
  fullPageHref: string;
  /**
   * When both are `undefined`, the ↑ / ↓ cluster is omitted (list pages without in-panel neighbors).
   * When set (including `null` for disabled), Prev/Next render with the usual disabled styling.
   */
  prevHref?: string | null;
  nextHref?: string | null;
  /** Override aria-label / title for ↑↓ (e.g. “Previous feedback”). */
  adjacentNavLabels?: Partial<PeekAdjacentNavLabels>;
  /** Extra classes on the outer `role="toolbar"` row */
  className?: string;
};

/**
 * Top-left icon row for peek panels: close », open full page, optional | , previous ↑, next ↓.
 */
export function PeekPanelToolbar({
  closeHref,
  fullPageHref,
  prevHref,
  nextHref,
  adjacentNavLabels,
  className = "",
}: PeekPanelToolbarProps) {
  const showAdjacent = prevHref !== undefined || nextHref !== undefined;
  const nav = { ...defaultAdjacentNavLabels, ...adjacentNavLabels };

  return (
    <div
      className={`d-flex align-items-center flex-wrap peek-panel-toolbar ${className}`.trim()}
      role="toolbar"
      aria-label="Panel controls"
    >
      <Link
        href={closeHref}
        className="peek-panel-icon-btn"
        aria-label="Close panel"
        title="Close panel"
      >
        <IconPeekClose />
      </Link>

      <Link
        href={fullPageHref}
        className="peek-panel-icon-btn"
        aria-label="Open full page"
        title="Open full page"
      >
        <IconPeekOpenFull />
      </Link>

      {showAdjacent ? (
        <>
          <span className="peek-panel-toolbar__rule" aria-hidden={true} />

          <div className="d-flex align-items-center peek-panel-nav-pair" role="group" aria-label="Adjacent items">
            {prevHref != null ? (
              <Link
                href={prevHref}
                className="peek-panel-icon-btn"
                aria-label={nav.prev}
                title={nav.prev}
              >
                <IconPeekChevronUp />
              </Link>
            ) : (
              <span
                className="peek-panel-icon-btn disabled"
                aria-disabled={true}
                aria-label={nav.noPrev}
                title={nav.noPrev}
              >
                <IconPeekChevronUp />
              </span>
            )}
            {nextHref != null ? (
              <Link
                href={nextHref}
                className="peek-panel-icon-btn"
                aria-label={nav.next}
                title={nav.next}
              >
                <IconPeekChevronDown />
              </Link>
            ) : (
              <span
                className="peek-panel-icon-btn disabled"
                aria-disabled={true}
                aria-label={nav.noNext}
                title={nav.noNext}
              >
                <IconPeekChevronDown />
              </span>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
