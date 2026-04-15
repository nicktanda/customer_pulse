"use client";

/**
 * Client-side row behavior for the feedback list (the page shell stays a server component for fast data load).
 *
 * - Clicking a row calls `router.push` to the same list URL with `?detail=<id>` so the right-hand panel opens.
 * - Checkboxes and the title link are excluded from that click handler so selection and middle-click “open in new tab” still work.
 * - `Enter` / `Space` on a focused row does the same as a click (keyboard accessibility).
 */
import Link from "next/link";
import { FeedbackMetaBadges } from "@/components/feedback/FeedbackMetaBadges";
import { formatAppDateTime } from "@/lib/format-app-date";
import { useDetailHrefNavigation } from "@/lib/use-detail-href-navigation";

export type FeedbackListRowModel = {
  id: number;
  title: string | null;
  content: string;
  source: number;
  category: number;
  priority: number;
  status: number;
  createdAt: Date;
  /** Full path including `?detail=` — built on the server so we never pass a function into this client component. */
  detailHref: string;
};

export function FeedbackListRows({
  rows,
  canEdit,
  selectedId,
}: {
  rows: FeedbackListRowModel[];
  canEdit: boolean;
  selectedId: number | null;
}) {
  const handlersFor = useDetailHrefNavigation();

  return (
    <>
      {rows.map((r) => {
        const href = r.detailHref;
        const isSelected = selectedId === r.id;
        const { onClick, onKeyDown } = handlersFor(href);
        return (
          <tr
            key={r.id}
            tabIndex={0}
            className={isSelected ? "feedback-list-row-selected" : undefined}
            onClick={onClick}
            onKeyDown={onKeyDown}
          >
            {canEdit ? (
              <td className="text-center" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  name="feedback_ids"
                  value={r.id}
                  className="form-check-input"
                  aria-label={`Select feedback ${r.id}`}
                />
              </td>
            ) : null}
            <td>
              <Link href={href} className="fw-medium link-primary text-decoration-none">
                {r.title || "(no title)"}
              </Link>
              <p className="small text-body-secondary mb-0 mt-1 line-clamp-2">{r.content}</p>
              <FeedbackMetaBadges
                source={r.source}
                category={r.category}
                priority={r.priority}
                status={r.status}
                compact
              />
            </td>
            <td className="small text-body-secondary text-nowrap">
              <span className="text-body-tertiary">#{r.id}</span>
            </td>
            <td className="small text-body-secondary text-nowrap">
              <time dateTime={r.createdAt.toISOString()} title={r.createdAt.toISOString()}>
                {formatAppDateTime(r.createdAt)}
              </time>
            </td>
          </tr>
        );
      })}
    </>
  );
}
