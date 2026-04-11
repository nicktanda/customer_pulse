import Link from "next/link";
import {
  feedbackSortToggleHref,
  type FeedbackListQuery,
  type FeedbackSortColumn,
} from "@/lib/feedback-list-query";

/**
 * Clickable table header: navigates with `sort` / `dir` query params (server applies ORDER BY).
 */
export function FeedbackTableSortHeader({
  column,
  label,
  listQuery,
  activeSort,
  activeDir,
  className,
}: {
  column: FeedbackSortColumn;
  label: string;
  listQuery: FeedbackListQuery;
  activeSort: FeedbackSortColumn;
  activeDir: "asc" | "desc";
  className?: string;
}) {
  const href = feedbackSortToggleHref(listQuery, column);
  const active = activeSort === column;

  return (
    <th scope="col" className={className}>
      <Link
        href={href}
        className="text-body text-decoration-none fw-semibold d-inline-flex align-items-center gap-1 feedback-sort-th"
      >
        <span>{label}</span>
        {active ? (
          <span className="small text-body-secondary" aria-hidden>
            {activeDir === "asc" ? "↓" : "↑"}
          </span>
        ) : null}
        <span className="visually-hidden">
          {active
            ? `, sorted ${activeDir === "asc" ? "ascending" : "descending"}. Click to reverse order.`
            : ". Click to sort this column."}
        </span>
      </Link>
    </th>
  );
}
