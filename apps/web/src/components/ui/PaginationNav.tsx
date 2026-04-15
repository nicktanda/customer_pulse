import Link from "next/link";
import type { ReactNode } from "react";

type PaginationNavProps = {
  /** e.g. “Previous” — shown when `prevHref` is set. */
  prevHref?: string | null;
  nextHref?: string | null;
  /** Short status between buttons, e.g. “Page 2 of 5”. */
  status?: ReactNode;
  className?: string;
};

/**
 * List pagination using the same button styling as the rest of the app (not plain text links).
 */
export function PaginationNav({ prevHref, nextHref, status, className = "" }: PaginationNavProps) {
  return (
    <div
      className={`d-flex flex-wrap align-items-center gap-2 ${className}`.trim()}
      role="navigation"
      aria-label="Pagination"
    >
      {prevHref ? (
        <Link href={prevHref} className="btn btn-sm btn-outline-secondary">
          Previous
        </Link>
      ) : (
        <span className="btn btn-sm btn-outline-secondary disabled" aria-disabled>
          Previous
        </span>
      )}
      {status ? <span className="small text-body-secondary px-1">{status}</span> : null}
      {nextHref ? (
        <Link href={nextHref} className="btn btn-sm btn-outline-secondary">
          Next
        </Link>
      ) : (
        <span className="btn btn-sm btn-outline-secondary disabled" aria-disabled>
          Next
        </span>
      )}
    </div>
  );
}
