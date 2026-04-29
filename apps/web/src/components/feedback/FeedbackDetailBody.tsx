import { FormActions, InlineAlert } from "@/components/ui";
import { ConfidenceBadge, confidenceLevel } from "@/components/ai/AiSuggestion";
import {
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_PRIORITY_LABELS,
  FEEDBACK_STATUS_LABELS,
} from "@/lib/feedback-enums-display";
import { formatAppDateTime } from "@/lib/format-app-date";
import { FeedbackMetaBadges } from "@/components/feedback/FeedbackMetaBadges";
import {
  acceptAiSuggestionAction,
  reprocessFeedbackAction,
  updateFeedbackAction,
} from "@/app/app/learn/feedback/actions";
import { feedbacks } from "@customer-pulse/db/client";

const HIGH_CONFIDENCE_THRESHOLD = 0.75;

/** One feedback row from Drizzle — same shape as `select()` from `feedbacks`. */
export type FeedbackRow = typeof feedbacks.$inferSelect;

/**
 * Shared “show feedback” content: summary, body, AI block, triage form, reprocess.
 * Used on the full `/app/feedback/[id]` page and in the list page’s right-hand panel.
 *
 * When `listReturnPath` is set, save/reprocess redirects back to the list URL (keeps filters + panel open).
 */
export function FeedbackDetailBody({
  row,
  feedbackId,
  canEdit,
  notice,
  listReturnPath,
  variant = "page",
}: {
  row: FeedbackRow;
  feedbackId: number;
  canEdit: boolean;
  notice: string | null;
  /** If set, server actions redirect here after save instead of the standalone show page. */
  listReturnPath: string | null;
  /** `panel` uses distinct field ids so the list + panel layout never duplicates `id` attributes. */
  variant?: "page" | "panel";
}) {
  const idSuf = variant === "panel" ? "-panel" : "";
  // Each form needs its own hidden input — React cannot reuse one element node in two places.
  const returnHidden =
    listReturnPath != null ? <input type="hidden" name="return_path" value={listReturnPath} /> : null;

  return (
    <>
      {notice === "reprocess" ? (
        <InlineAlert variant="success">Queued for AI reprocessing (when Redis and the worker are running).</InlineAlert>
      ) : null}

      <section
        className="card border-secondary-subtle shadow-sm"
        aria-labelledby="fb-summary-heading"
      >
        <div className="card-body py-3">
          <h2 id="fb-summary-heading" className="h6 text-body-emphasis mb-2">
            Summary
          </h2>
          <p className="small text-body-secondary mb-2">
            Source, category, priority, and status — same badges as the feedback list for quick recognition.
          </p>
          <FeedbackMetaBadges
            source={row.source}
            category={row.category}
            priority={row.priority}
            status={row.status}
          />
        </div>
      </section>

      <section className="card border-secondary-subtle shadow-sm mt-3" aria-labelledby="fb-content-heading">
        <div className="card-body">
          <h2 id="fb-content-heading" className="h6 text-body-emphasis">
            Content
          </h2>
          <p className="mb-0 mt-2 text-body-secondary" style={{ whiteSpace: "pre-wrap" }}>
            {row.content}
          </p>
          {row.authorName || row.authorEmail ? (
            <p className="small text-body-secondary mb-0 mt-2">
              {row.authorName}
              {row.authorEmail ? ` <${row.authorEmail}>` : ""}
            </p>
          ) : null}
        </div>
      </section>

      {row.aiSummary ? (
        <section className="card border-secondary-subtle shadow-sm mt-3" aria-labelledby="fb-ai-heading">
          <div className="card-body">
            <div className="d-flex align-items-center justify-content-between gap-2">
              <h2 id="fb-ai-heading" className="h6 text-body-emphasis mb-0">
                AI summary
              </h2>
              <ConfidenceBadge score={row.aiConfidenceScore} />
            </div>
            <p className="small text-body-secondary mb-1 mt-2">{row.aiSummary}</p>
            <p className="small text-body-tertiary mb-0">
              Processed: {row.aiProcessedAt ? formatAppDateTime(row.aiProcessedAt) : "—"}
            </p>
          </div>
        </section>
      ) : null}

      {canEdit ? (
        <>
          <section className="card border-secondary-subtle shadow-sm mt-3" aria-labelledby="fb-triage-heading">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between gap-2">
                <h2 id="fb-triage-heading" className="h6 text-body-emphasis mb-0">
                  Triage
                </h2>
                {row.aiProcessedAt ? <ConfidenceBadge score={row.aiConfidenceScore} hideLabel /> : null}
              </div>
              {/* High-confidence path: one-click accept the AI's classification. */}
              {!row.manuallyReviewed &&
              row.aiProcessedAt &&
              (row.aiConfidenceScore ?? 0) >= HIGH_CONFIDENCE_THRESHOLD ? (
                <div
                  className="rounded-3 p-3 mt-2"
                  style={{ background: "rgba(var(--bs-success-rgb), 0.06)" }}
                >
                  <p className="small text-body-secondary mb-2">
                    Claude classified this with{" "}
                    <strong>{confidenceLevel(row.aiConfidenceScore)} confidence</strong>. Accept to mark it reviewed
                    without changes, or override below if anything is off.
                  </p>
                  <form action={acceptAiSuggestionAction.bind(null, feedbackId)} className="d-inline">
                    {returnHidden}
                    <button type="submit" className="btn btn-success btn-sm">
                      Accept AI triage
                    </button>
                  </form>
                  <details className="mt-3">
                    <summary className="small text-body-secondary" style={{ cursor: "pointer" }}>
                      Override fields
                    </summary>
                    <TriageForm
                      feedbackId={feedbackId}
                      row={row}
                      idSuf={idSuf}
                      returnHidden={returnHidden}
                    />
                  </details>
                </div>
              ) : null}

              {/* Low/medium confidence (or already reviewed): expanded form by default. */}
              {row.manuallyReviewed ||
              !row.aiProcessedAt ||
              (row.aiConfidenceScore ?? 0) < HIGH_CONFIDENCE_THRESHOLD ? (
                <>
                  <p className="small text-body-secondary mb-0">
                    {row.aiProcessedAt && (row.aiConfidenceScore ?? 0) < HIGH_CONFIDENCE_THRESHOLD
                      ? "Low confidence — please review the AI's suggestion before saving."
                      : "Update how this item is classified. Tick Manually reviewed once a human has confirmed."}
                  </p>
                  <TriageForm
                    feedbackId={feedbackId}
                    row={row}
                    idSuf={idSuf}
                    returnHidden={returnHidden}
                  />
                </>
              ) : null}
            </div>
          </section>

          <form action={reprocessFeedbackAction.bind(null, feedbackId)} className="mt-3">
            {listReturnPath != null ? (
              <input type="hidden" name="return_path" value={listReturnPath} />
            ) : null}
            <button type="submit" className="btn btn-outline-secondary btn-sm">
              Re-run AI processing
            </button>
          </form>
        </>
      ) : (
        <p className="mt-3 small text-body-secondary mb-0">You have read-only access to this project.</p>
      )}
    </>
  );
}

function TriageForm({
  feedbackId,
  row,
  idSuf,
  returnHidden,
}: {
  feedbackId: number;
  row: FeedbackRow;
  idSuf: string;
  returnHidden: React.ReactNode;
}) {
  return (
    <form action={updateFeedbackAction.bind(null, feedbackId)} className="row g-3 mt-1">
      {returnHidden}
      <SelectField
        idSuffix={idSuf}
        name="status"
        label="Status"
        value={row.status}
        options={FEEDBACK_STATUS_LABELS}
      />
      <SelectField
        idSuffix={idSuf}
        name="priority"
        label="Priority"
        value={row.priority}
        options={FEEDBACK_PRIORITY_LABELS}
      />
      <SelectField
        idSuffix={idSuf}
        name="category"
        label="Category"
        value={row.category}
        options={FEEDBACK_CATEGORY_LABELS}
      />
      <div className="col-12">
        <div className="form-check">
          <input
            type="checkbox"
            name="manually_reviewed"
            defaultChecked={row.manuallyReviewed}
            value="true"
            className="form-check-input"
            id={`fb-reviewed${idSuf}`}
          />
          <label className="form-check-label" htmlFor={`fb-reviewed${idSuf}`}>
            Manually reviewed
          </label>
        </div>
      </div>
      <div className="col-12">
        <FormActions variant="plain" className="mt-2">
          <button type="submit" className="btn btn-primary btn-sm">
            Save triage
          </button>
        </FormActions>
      </div>
    </form>
  );
}

function SelectField({
  idSuffix,
  name,
  label,
  value,
  options,
}: {
  idSuffix: string;
  name: string;
  label: string;
  value: number;
  options: Record<number, string>;
}) {
  const id = `fb-${name}${idSuffix}`;
  return (
    <div className="col-sm-6 col-md-4">
      <label htmlFor={id} className="form-label small mb-1">
        {label}
      </label>
      <select name={name} id={id} defaultValue={String(value)} className="form-select form-select-sm">
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );
}
