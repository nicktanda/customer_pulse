import Link from "next/link";
import { formatAppDateTime } from "@/lib/format-app-date";
import { feedbackListHref } from "@/lib/feedback-list-query";
import {
  insightSeverityLabel,
  insightStatusLabel,
  insightTypeLabel,
} from "@/lib/insight-enums-display";
import { insights } from "@customer-pulse/db/client";

export type InsightRow = typeof insights.$inferSelect;

export type LinkedFeedbackItem = {
  feedbackId: number;
  title: string | null;
  relevanceScore: number;
  contributionSummary: string | null;
};

/**
 * Main insight content: badges, summary, evidence, related feedback.
 * Shared by the full `/app/insights/[id]` page and the list page's right-hand panel.
 *
 * showSpecCta defaults to true. Pass false on the standalone page (which already
 * has a "Create spec" button in the page header) to avoid showing it twice.
 */
export function InsightDetailBody({
  row,
  linkedFeedback,
  showSpecCta = true,
}: {
  row: InsightRow;
  linkedFeedback: LinkedFeedbackItem[];
  /** Whether to render the ember-themed "Create spec" CTA block. Default: true. */
  showSpecCta?: boolean;
}) {
  const when = row.discoveredAt ?? row.createdAt;
  const evidence = Array.isArray(row.evidence) ? row.evidence : [];

  return (
    <>
      {/* Badges row */}
      <div className="d-flex flex-wrap gap-2 mt-0">
        <span className="badge rounded-pill text-bg-light border">{insightTypeLabel(row.insightType)}</span>
        <span className="badge rounded-pill text-bg-light border">{insightSeverityLabel(row.severity)}</span>
        <span className="badge rounded-pill text-bg-light border">{insightStatusLabel(row.status)}</span>
        {row.confidenceScore > 0 ? (
          <span className="badge rounded-pill text-bg-secondary">Confidence {row.confidenceScore}%</span>
        ) : null}
        {row.feedbackCount > 0 ? (
          <span className="badge rounded-pill text-bg-secondary">{row.feedbackCount} feedback</span>
        ) : null}
      </div>

      {/*
       * Create spec CTA — ember-themed action block.
       * Gives the button visual weight separate from the metadata badges,
       * and signals that this is the primary next step for this insight.
       * Hidden on the standalone page which already has the CTA in its header.
       */}
      {showSpecCta ? (
        <div
          className="d-flex align-items-center justify-content-between gap-3 mt-3 px-3 py-2 rounded"
          style={{
            background: "rgba(var(--bs-primary-rgb), 0.06)",
            border: "1px solid rgba(var(--bs-primary-rgb), 0.2)",
          }}
        >
          <div className="min-w-0">
            <p className="small fw-semibold text-body-emphasis mb-0">Ready to build?</p>
            <p className="small text-body-secondary mb-0" style={{ lineHeight: 1.4 }}>
              Turn this insight into a product spec
            </p>
          </div>
          <Link
            href={`/app/build/specs/new?from_insight=${row.id}`}
            className="btn btn-primary btn-sm flex-shrink-0"
          >
            Create spec →
          </Link>
        </div>
      ) : null}

      <section className="mt-4">
        <h2 className="h6 text-body-emphasis">Summary</h2>
        <p className="small text-body-secondary mb-0" style={{ whiteSpace: "pre-wrap" }}>
          {row.description}
        </p>
      </section>

      {evidence.length > 0 ? (
        <section className="mt-4">
          <h2 className="h6 text-body-emphasis">Evidence</h2>
          <p className="small text-body-secondary mb-2">
            Snippets or structured notes the model stored alongside this insight.
          </p>
          <ul className="list-group list-group-flush shadow-sm border rounded small">
            {evidence.map((item, i) => (
              <li key={i} className="list-group-item text-body-secondary" style={{ whiteSpace: "pre-wrap" }}>
                {typeof item === "string" ? item : JSON.stringify(item, null, 2)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-4">
        <h2 className="h6 text-body-emphasis">Related feedback</h2>
        {linkedFeedback.length === 0 ? (
          <p className="small text-body-secondary mb-0">
            No explicit links in the database yet. The counts above may still reflect clustering from the discovery job.
          </p>
        ) : (
          <ul className="list-group shadow-sm mt-2">
            {linkedFeedback.map((f) => (
              <li key={f.feedbackId} className="list-group-item small">
                <Link
                  href={feedbackListHref({ detail: f.feedbackId })}
                  className="fw-medium link-primary text-decoration-none"
                >
                  {f.title || "(no title)"}
                </Link>
                {f.contributionSummary ? (
                  <p className="text-body-secondary mb-0 mt-1">{f.contributionSummary}</p>
                ) : null}
                {f.relevanceScore > 0 ? (
                  <p className="text-body-secondary mb-0 mt-1" style={{ fontSize: "0.75rem" }}>
                    Relevance {(f.relevanceScore * 100).toFixed(0)}%
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="small text-body-tertiary mt-3 mb-0">
        Discovered / updated {formatAppDateTime(when)}
        {row.affectedUsersCount > 0 ? ` · ~${row.affectedUsersCount} affected users (estimate)` : null}
      </p>
    </>
  );
}
