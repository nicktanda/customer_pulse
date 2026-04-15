import {
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_PRIORITY_LABELS,
  FEEDBACK_SOURCE_LABELS,
  FEEDBACK_STATUS_LABELS,
} from "@/lib/feedback-enums-display";

/** Same values as `FeedbackPriority` in `packages/db/src/enums.ts` — avoid importing DB client in the browser. */
const PRIORITY_P1 = 1;
const PRIORITY_P2 = 2;
const PRIORITY_P3 = 3;

type FeedbackMetaBadgesProps = {
  source: number;
  category: number;
  priority: number;
  status: number;
  /** When true, wraps in a cell-friendly span for table layout. */
  compact?: boolean;
};

/**
 * Visual tags for feedback list rows — faster to scan than a single sentence of metadata.
 * P1 stays Bootstrap danger (red). P2/P3 use custom classes in `globals.css` so they stay
 * clearly orange and yellow (this app’s theme turns generic `text-bg-warning` into grey).
 */
function priorityBadgeClass(priority: number): string {
  if (priority === PRIORITY_P1) {
    return "text-bg-danger";
  }
  if (priority === PRIORITY_P2) {
    return "feedback-priority-badge--p2";
  }
  if (priority === PRIORITY_P3) {
    return "feedback-priority-badge--p3";
  }
  return "text-bg-secondary";
}

export function FeedbackMetaBadges({ source, category, priority, status, compact }: FeedbackMetaBadgesProps) {
  const wrapClass = compact ? "d-flex flex-wrap gap-1" : "d-flex flex-wrap gap-1 mt-1";

  return (
    <div className={wrapClass} aria-label="Feedback attributes">
      <span className="badge text-bg-secondary">
        {FEEDBACK_SOURCE_LABELS[source] ?? `Source ${source}`}
      </span>
      <span className="badge text-bg-secondary">
        {FEEDBACK_CATEGORY_LABELS[category] ?? `Category ${category}`}
      </span>
      <span className={`badge ${priorityBadgeClass(priority)}`}>
        {FEEDBACK_PRIORITY_LABELS[priority] ?? `P${priority}`}
      </span>
      <span className="badge text-bg-secondary">
        {FEEDBACK_STATUS_LABELS[status] ?? `Status ${status}`}
      </span>
    </div>
  );
}
