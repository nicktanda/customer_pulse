import { PeekPanelEntityLink, PeekPanelHeader } from "@/components/ui/peek-panel";

/**
 * Feedback list side panel: shared peek chrome + pill id + title.
 * Toolbar icons live in `@/components/ui/peek-panel` for reuse on other master–detail pages.
 */
export function FeedbackDetailPanelHeader({
  feedbackId,
  title,
  closePanelHref,
  prevHref,
  nextHref,
}: {
  feedbackId: number;
  title: string;
  closePanelHref: string;
  prevHref: string | null;
  nextHref: string | null;
}) {
  const fullPageHref = `/app/feedback/${feedbackId}`;

  return (
    <PeekPanelHeader
      closeHref={closePanelHref}
      fullPageHref={fullPageHref}
      prevHref={prevHref}
      nextHref={nextHref}
      adjacentNavLabels={{
        prev: "Previous feedback",
        next: "Next feedback",
        noPrev: "No newer feedback in this list",
        noNext: "No older feedback in this list",
      }}
    >
      <PeekPanelEntityLink href={fullPageHref} title={`Open feedback #${feedbackId} on its own page`}>
        #{feedbackId}
      </PeekPanelEntityLink>
      <h2 className="h5 text-body-emphasis mb-0 text-break peek-panel-title">{title}</h2>
    </PeekPanelHeader>
  );
}
