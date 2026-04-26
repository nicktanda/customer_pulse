import { FormActions, InlineAlert } from "@/components/ui";
import {
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_PRIORITY_LABELS,
  FEEDBACK_STATUS_LABELS,
} from "@/lib/feedback-enums-display";
import { formatAppDateTime } from "@/lib/format-app-date";
import { FeedbackMetaBadges } from "@/components/feedback/FeedbackMetaBadges";
import { reprocessFeedbackAction, updateFeedbackAction } from "@/app/app/learn/feedback/actions";
import { feedbacks } from "@customer-pulse/db/client";

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
            <h2 id="fb-ai-heading" className="h6 text-body-emphasis">
              AI summary
            </h2>
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
              <h2 id="fb-triage-heading" className="h6 text-body-emphasis">
                Triage
              </h2>
              <p className="small text-body-secondary mb-0">
                Update how this item is classified. Check <strong>Manually reviewed</strong> when you have finished
                triage — that records that a human confirmed the fields (the old &quot;Quick override&quot; flow is
                folded into this single save).
              </p>
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
