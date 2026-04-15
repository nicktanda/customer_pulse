import Link from "next/link";
import { InlineAlert } from "@/components/ui";
import { resendPulseReportAction, generatePrForIdeaAction } from "@/app/app/pulse-reports/actions";
import { feedbackListHref } from "@/lib/feedback-list-query";
import { insightsListHref } from "@/lib/insights-list-query";
import type { PulseReportPageData } from "@/lib/pulse-report-page-data";
import { PrJobPoller } from "./PrJobPoller";
import { PrSubmitButton } from "./PrSubmitButton";
/**
 * Report content below the page header: alerts, feedback in period, insights, ideas + PR controls.
 * Used on `/app/pulse-reports/[id]` and on the list page’s `?detail=` panel (`variant="panel"` trims heavy actions).
 */
export function PulseReportDetailBody({
  data,
  canEdit,
  notice,
  err,
  variant = "page",
}: {
  data: PulseReportPageData;
  canEdit: boolean;
  notice: string | null;
  err: string | null;
  variant?: "page" | "panel";
}) {
  const { row, periodFeedbacks, insightRows, quickWins, highImpact, prByIdea, hasPendingPrs } = data;
  const fullReportHref = `/app/pulse-reports/${row.id}`;

  return (
    <>
      {notice === "resend" ? <InlineAlert variant="success">Resend queued.</InlineAlert> : null}
      {err === "notsent" ? (
        <InlineAlert variant="danger" className="mt-3">
          That report has not been sent yet.
        </InlineAlert>
      ) : null}

      {variant === "panel" ? (
        <p className="small text-body-secondary mt-3 mb-0">
          <span className="fw-medium">Tip:</span> Open the{" "}
          <Link href={fullReportHref} className="link-primary">
            full report page
          </Link>{" "}
          to resend the digest or generate GitHub PRs for ideas.
        </p>
      ) : null}

      {canEdit && row.sentAt && variant === "page" ? (
        <form action={resendPulseReportAction.bind(null, row.id)} className="mt-3">
          <button type="submit" className="btn btn-outline-secondary btn-sm">
            Resend digest
          </button>
        </form>
      ) : null}

      <PrJobPoller hasPendingPrs={hasPendingPrs} />

      <section className="mt-5">
        <h2 className="h5 text-body-emphasis">Feedback in period</h2>
        <ul className="list-group shadow-sm mt-2">
          {periodFeedbacks.length === 0 ? (
            <li className="list-group-item text-body-secondary small">None.</li>
          ) : (
            periodFeedbacks.map((f) => (
              <li key={f.id} className="list-group-item">
                <Link href={feedbackListHref({ detail: f.id })} className="link-primary">
                  {f.title || "(no title)"}
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mt-5">
        <h2 className="h5 text-body-emphasis">Insights in report period</h2>
        <p className="small text-body-secondary mb-0 mt-1">
          Insights whose <span className="fw-medium">created</span> timestamp falls in the same range as this report
          (see dates in the title).
        </p>
        <ul className="list-unstyled mt-2 mb-0 d-flex flex-column gap-2">
          {insightRows.length === 0 ? (
            <li className="text-body-secondary small">None.</li>
          ) : (
            insightRows.map((i) => (
              <li key={i.id} className="card border-secondary-subtle">
                <div className="card-body py-3 small">
                  <p className="fw-medium text-body-emphasis mb-1">
                    <Link href={insightsListHref({ detail: i.id })} className="link-primary text-decoration-none">
                      {i.title}
                    </Link>
                  </p>
                  <p className="text-body-secondary mb-0">{i.description}</p>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <IdeaSection
        title="Quick wins"
        reportId={row.id}
        list={quickWins}
        canEdit={canEdit}
        prByIdea={prByIdea}
        variant={variant}
        fullReportHref={fullReportHref}
      />
      <IdeaSection
        title="High impact, low effort"
        reportId={row.id}
        list={highImpact}
        canEdit={canEdit}
        prByIdea={prByIdea}
        variant={variant}
        fullReportHref={fullReportHref}
      />
    </>
  );
}

function IdeaSection({
  title,
  reportId,
  list,
  canEdit,
  prByIdea,
  variant,
  fullReportHref,
}: {
  title: string;
  reportId: number;
  list: { id: number; title: string; description: string }[];
  canEdit: boolean;
  prByIdea: Map<number, { status: number; progressMessage: string | null; prNumber: number | null; prUrl: string | null; errorMessage: string | null }[]>;
  variant: "page" | "panel";
  fullReportHref: string;
}) {
  return (
    <section className="mt-5">
      <h2 className="h5 text-body-emphasis">{title}</h2>
      <ul className="list-unstyled mt-2 mb-0 d-flex flex-column gap-3">
        {list.length === 0 ? (
          <li className="text-body-secondary small">None.</li>
        ) : (
          list.map((idea) => {
            const prs = prByIdea.get(idea.id) ?? [];
            const generating = prs.find((p) => p.status === 0);
            const openPr = prs.find((p) => p.status === 1);
            const mergedPr = prs.find((p) => p.status === 2);
            const closedPr = prs.find((p) => p.status === 3);
            const failedPr = prs.find((p) => p.status === 4);
            const showGenerateButton = !generating && !openPr && canEdit;
            return (
              <li key={idea.id} className="card border-secondary-subtle">
                <div className="card-body py-3 small">
                  <p className="fw-medium text-body-emphasis mb-1">{idea.title}</p>
                  <p className="text-body-secondary mb-0">{idea.description}</p>
                  {generating ? (
                    <p className="mt-2 mb-0 text-body-secondary d-flex align-items-center gap-1" style={{ fontSize: "0.75rem" }}>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: "0.75rem", height: "0.75rem" }} />
                      {generating.progressMessage ?? "Generating PR\u2026"}
                    </p>
                  ) : openPr?.prUrl ? (
                    <p className="mt-2 mb-0" style={{ fontSize: "0.75rem" }}>
                      <a href={openPr.prUrl} target="_blank" rel="noopener noreferrer" className="link-primary">
                        PR #{openPr.prNumber} opened
                      </a>
                    </p>
                  ) : mergedPr?.prUrl ? (
                    <p className="mt-2 mb-0 text-success" style={{ fontSize: "0.75rem" }}>
                      <a href={mergedPr.prUrl} target="_blank" rel="noopener noreferrer" className="link-success">
                        PR #{mergedPr.prNumber} merged
                      </a>
                    </p>
                  ) : closedPr?.prUrl ? (
                    <div className="mt-2 mb-0 d-flex align-items-center gap-2" style={{ fontSize: "0.75rem" }}>
                      <span className="text-body-secondary">
                        <a href={closedPr.prUrl} target="_blank" rel="noopener noreferrer" className="text-body-secondary">
                          PR #{closedPr.prNumber} closed
                        </a>
                      </span>
                      {showGenerateButton && variant === "page" ? (
                        <form action={generatePrForIdeaAction.bind(null, idea.id)} className="d-inline">
                          <PrSubmitButton label="Regenerate" style={{ fontSize: "0.75rem" }} />
                        </form>
                      ) : showGenerateButton && variant === "panel" ? (
                        <Link href={fullReportHref} className="link-primary" style={{ fontSize: "0.75rem" }}>
                          Regenerate
                        </Link>
                      ) : null}
                    </div>
                  ) : failedPr ? (
                    <div className="mt-2 mb-0 d-flex align-items-center gap-2" style={{ fontSize: "0.75rem" }}>
                      <span className="text-danger">
                        Failed: {failedPr.errorMessage ?? failedPr.progressMessage ?? "unknown error"}
                      </span>
                      {showGenerateButton && variant === "page" ? (
                        <form action={generatePrForIdeaAction.bind(null, idea.id)} className="d-inline">
                          <PrSubmitButton label="Retry" style={{ fontSize: "0.75rem" }} />
                        </form>
                      ) : showGenerateButton && variant === "panel" ? (
                        <Link href={fullReportHref} className="link-primary" style={{ fontSize: "0.75rem" }}>
                          Retry
                        </Link>
                      ) : null}
                    </div>
                  ) : showGenerateButton && variant === "page" ? (
                    <form action={generatePrForIdeaAction.bind(null, idea.id)} className="mt-2 mb-0">
                      <PrSubmitButton label="Generate GitHub PR" />
                    </form>
                  ) : canEdit && variant === "panel" ? (
                    <p className="mt-2 mb-0 small">
                      <Link href={fullReportHref} className="link-primary">
                        Full report #{reportId}
                      </Link>{" "}
                      to generate a PR for this idea.
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
