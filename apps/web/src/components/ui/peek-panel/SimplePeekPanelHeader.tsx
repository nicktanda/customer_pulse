import type { ReactNode } from "react";
import { PeekPanelEntityLink } from "./PeekPanelEntityLink";
import { PeekPanelHeader } from "./PeekPanelHeader";

type SimplePeekPanelHeaderProps = {
  closeHref: string;
  /** Canonical URL for “open full page” and the #id pill link. */
  fullPageHref: string;
  entityId: number;
  /** Main heading (plain text or formatted nodes, e.g. date range). */
  title: ReactNode;
  /** Optional line under the title (source type, slug, sent status, etc.). */
  subtitle?: ReactNode;
  /** Tooltip on the #id pill; defaults to a generic full-page hint. */
  entityLinkTitle?: string;
};

/**
 * Standard peek title block for list + side panels: icon toolbar (via PeekPanelHeader),
 * linked #id pill, heading, optional subtitle. No prev/next — use Feedback’s header when you need that.
 */
export function SimplePeekPanelHeader({
  closeHref,
  fullPageHref,
  entityId,
  title,
  subtitle,
  entityLinkTitle,
}: SimplePeekPanelHeaderProps) {
  return (
    <PeekPanelHeader closeHref={closeHref} fullPageHref={fullPageHref}>
      <PeekPanelEntityLink
        href={fullPageHref}
        title={entityLinkTitle ?? `Open #${entityId} on its own page`}
      >
        #{entityId}
      </PeekPanelEntityLink>
      <h2 className="h5 text-body-emphasis mb-0 text-break peek-panel-title">{title}</h2>
      {subtitle ? <p className="small text-body-secondary mb-0 mt-1">{subtitle}</p> : null}
    </PeekPanelHeader>
  );
}
