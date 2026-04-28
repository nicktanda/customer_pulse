import Link from "next/link";
import type {
  DiscoveryActivityStatusCounts,
  DiscoveryBoardActivityRow,
  DiscoveryOstMapData,
} from "@customer-pulse/db/queries/discovery";
import { DiscoverOstMapPanel } from "./DiscoverOstMapPanel";
import { boardColumnLabel } from "@/lib/discovery-board";
import { discoveryOstMapActivityStatusLabel } from "@/lib/discovery-ost-map-labels";
import {
  whosDoingWhatBoardFilterHref,
  type WhosDoingWhatGroup,
} from "@/lib/discovery-whos-doing-what";

type Props = {
  projectName: string;
  mapData: DiscoveryOstMapData;
  canEdit: boolean;
  statusCounts: DiscoveryActivityStatusCounts;
  opportunityCount: number;
  myQueueCount: number;
  recentActivities: DiscoveryBoardActivityRow[];
  /** Grouped "who owns what" for non-archived work — same owner rules as the board. */
  whosDoingWhat: WhosDoingWhatGroup[];
};

/**
 * Rich Discover landing: at-a-glance, who’s doing what, recently updated, then the embedded OST map.
 * (Discover navigation lives in the app sidebar; we no longer duplicate a “Go to” strip here.)
 */
export function DiscoverHubContent({
  projectName,
  mapData,
  canEdit,
  statusCounts,
  opportunityCount,
  myQueueCount,
  recentActivities,
  whosDoingWhat,
}: Props) {
  const c = statusCounts;
  // Single bucket = no assignees or leads yet; avoid a one-third-width card with empty space beside it.
  const whosUnassignedOnly =
    whosDoingWhat.length === 1 && whosDoingWhat[0]!.userId == null
      ? whosDoingWhat[0]!
      : null;

  return (
    <div className="d-flex flex-column gap-4">
      <section className="card border-secondary-subtle shadow-sm" aria-label="At a glance">
        <div className="card-body py-3">
          <h2 className="h6 text-body-emphasis mb-3">At a glance</h2>
          {/*
            Seven tiles used to be `col-md-2` each (7×2=14) — that breaks the 12-col grid and wraps badly.
            `row-cols-*` keeps counts even: 2 per row on narrow, 3 on md, 4 on xl.
          */}
          <div className="row row-cols-2 row-cols-md-3 row-cols-xl-4 g-2 g-md-3">
            <div className="col">
              <div className="rounded-2 border border-secondary-subtle p-2 p-md-3 h-100 text-center">
                <p className="h4 mb-0 text-body-emphasis tabular-nums">{c.total}</p>
                <p className="small text-body-secondary mb-0">Total activities</p>
              </div>
            </div>
            <div className="col">
              <div className="rounded-2 border border-secondary-subtle p-2 p-md-3 h-100 text-center">
                <p className="h4 mb-0 text-body-emphasis tabular-nums">{opportunityCount}</p>
                <p className="small text-body-secondary mb-0">On the OST Map</p>
                <p className="text-body-tertiary mb-0" style={{ fontSize: "0.65rem" }}>
                  (with discovery work)
                </p>
              </div>
            </div>
            <div className="col">
              <div className="rounded-2 border border-secondary-subtle p-2 p-md-3 h-100 text-center">
                <p className="h4 mb-0 text-body-emphasis tabular-nums">{myQueueCount}</p>
                <p className="small text-body-secondary mb-0">In your queue</p>
                <Link
                  href="/app/discover/me"
                  className="d-inline-block small text-decoration-none mt-1"
                >
                  My queue
                  <span className="visually-hidden"> (opens your discovery queue)</span>
                </Link>
              </div>
            </div>
            <div className="col">
              <div className="rounded-2 border border-secondary-subtle p-2 p-md-3 h-100 text-center">
                <p className="h4 mb-0 text-body-emphasis tabular-nums">{c.draft}</p>
                <p className="small text-body-secondary mb-0">{boardColumnLabel[1]}</p>
                <Link
                  href="/app/discover/board?column=1"
                  className="d-inline-block small text-decoration-none mt-1"
                >
                  On board
                  <span className="visually-hidden">, {boardColumnLabel[1]} column</span>
                </Link>
              </div>
            </div>
            <div className="col">
              <div className="rounded-2 border border-secondary-subtle p-2 p-md-3 h-100 text-center">
                <p className="h4 mb-0 text-body-emphasis tabular-nums">{c.inProgress}</p>
                <p className="small text-body-secondary mb-0">{boardColumnLabel[2]}</p>
                <Link
                  href="/app/discover/board?column=2"
                  className="d-inline-block small text-decoration-none mt-1"
                >
                  On board
                  <span className="visually-hidden">, {boardColumnLabel[2]} column</span>
                </Link>
              </div>
            </div>
            <div className="col">
              <div className="rounded-2 border border-secondary-subtle p-2 p-md-3 h-100 text-center">
                <p className="h4 mb-0 text-body-emphasis tabular-nums">{c.complete}</p>
                <p className="small text-body-secondary mb-0">{boardColumnLabel[3]}</p>
                <Link
                  href="/app/discover/board?column=3"
                  className="d-inline-block small text-decoration-none mt-1"
                >
                  On board
                  <span className="visually-hidden">, {boardColumnLabel[3]} column</span>
                </Link>
              </div>
            </div>
            <div className="col">
              <div className="rounded-2 border border-secondary-subtle p-2 p-md-3 h-100 text-center">
                <p className="h4 mb-0 text-body-emphasis tabular-nums">{c.archived}</p>
                <p className="small text-body-secondary mb-0">{boardColumnLabel[4]}</p>
                <Link
                  href="/app/discover/board?column=4"
                  className="d-inline-block small text-decoration-none mt-1"
                >
                  On board
                  <span className="visually-hidden">, {boardColumnLabel[4]} column</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team view: which people are on the hook for which experiments (excludes archived). */}
      <section
        className="card border-secondary-subtle shadow-sm"
        aria-labelledby="whos-doing-what-heading"
      >
        <div className="card-body py-3">
          <div className="d-flex flex-wrap align-items-baseline justify-content-between gap-2 mb-2">
            <h2 id="whos-doing-what-heading" className="h6 text-body-emphasis mb-0">
              Who&apos;s doing what
            </h2>
            <p className="small text-body-tertiary mb-0" style={{ maxWidth: "36rem" }}>
              Active work only (not archived). Owner = assignee, or insight lead if no assignee, else{" "}
              <span className="text-body-secondary">Unassigned</span> — same as the board.
            </p>
          </div>
          {whosDoingWhat.length === 0 ? (
            <p className="text-body-secondary small mb-0">
              No active discovery activities in this project yet. When people pick up work on the
              board, it will show up here.
            </p>
          ) : whosUnassignedOnly != null ? (
            <div>
              {/*
                When every activity is “Unassigned,” a single 4-col card looked like a tiny sliver
                on the left; use a full-width explainer + list-group so the section breathes.
              */}
              <div className="d-flex flex-wrap align-items-baseline justify-content-between gap-2 mb-2">
                <p className="text-body-secondary small mb-0" style={{ maxWidth: "42rem" }}>
                  <span className="text-body-emphasis">No assignees or insight leads yet</span> — all active
                  work is in the unassigned pool. Set an assignee on a card (or a lead on the insight) to
                  split this view by person.
                </p>
                <Link
                  href={whosDoingWhatBoardFilterHref(null)}
                  className="small text-decoration-none flex-shrink-0"
                >
                  Unassigned on board
                </Link>
              </div>
              <ul className="list-group list-group-flush small border border-secondary-subtle rounded-3 mb-0">
                {whosUnassignedOnly.activities.map((a) => (
                  <li
                    key={a.id}
                    className="list-group-item d-flex flex-column flex-sm-row flex-sm-wrap align-items-sm-start justify-content-sm-between gap-1"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/app/discover/activities/${a.id}`}
                        className="text-body-emphasis text-decoration-none fw-medium"
                        style={{ lineHeight: 1.35 }}
                        title={a.title}
                      >
                        {a.title}
                      </Link>
                      <div className="text-body-tertiary" style={{ fontSize: "0.8rem" }}>
                        {discoveryOstMapActivityStatusLabel(a.status)} · {formatRelTime(a.updatedAt)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {whosUnassignedOnly.moreCount > 0 ? (
                <p className="text-body-tertiary small mb-0 mt-2" style={{ fontSize: "0.8rem" }}>
                  +{whosUnassignedOnly.moreCount} more on the{" "}
                  <Link href={whosDoingWhatBoardFilterHref(null)} className="text-decoration-none">
                    board
                  </Link>{" "}
                  (unassigned filter)
                </p>
              ) : null}
            </div>
          ) : (
            <div className="row g-3">
              {whosDoingWhat.map((g) => (
                <div key={g.userId ?? "unassigned"} className="col-12 col-md-6 col-xl-4">
                  <div className="border border-secondary-subtle rounded-3 p-3 h-100 bg-body-tertiary">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="fw-semibold text-body-emphasis mb-0 text-truncate" title={g.displayLabel}>
                          {g.displayLabel}
                        </p>
                        <p className="text-body-tertiary small mb-0" style={{ fontSize: "0.75rem" }}>
                          {g.totalForPerson} active{g.totalForPerson === 1 ? "" : " items"}
                        </p>
                      </div>
                      {/*
                        Text link, not a second button style — matches “Full board” in Recently
                        updated and avoids a grey outline that fought the orange link theme.
                      */}
                      <Link
                        href={whosDoingWhatBoardFilterHref(g.userId)}
                        className="small text-decoration-none flex-shrink-0"
                      >
                        Board
                      </Link>
                    </div>
                    <ul className="list-unstyled small mb-0 d-flex flex-column gap-1">
                      {g.activities.map((a) => (
                        <li key={a.id} className="d-flex flex-column gap-0">
                          <Link
                            href={`/app/discover/activities/${a.id}`}
                            className="text-body-emphasis text-decoration-none text-truncate"
                            style={{ lineHeight: 1.35 }}
                            title={a.title}
                          >
                            {a.title}
                          </Link>
                          <span className="text-body-tertiary" style={{ fontSize: "0.72rem" }}>
                            {discoveryOstMapActivityStatusLabel(a.status)} · {formatRelTime(a.updatedAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {g.moreCount > 0 ? (
                      <p className="text-body-tertiary small mb-0 mt-2" style={{ fontSize: "0.75rem" }}>
                        +{g.moreCount} more on the{" "}
                        <Link href={whosDoingWhatBoardFilterHref(g.userId)} className="text-decoration-none">
                          board
                        </Link>
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/*
        Recently updated comes before the OST map so the list stays visible without scrolling past
        a tall tree. Anchor: #recently-updated.
      */}
      <section
        id="recently-updated"
        className="scroll-target-discover-map"
        aria-labelledby="recently-updated-heading"
      >
        <div className="card border-secondary-subtle shadow-sm">
          <div className="card-header py-2 d-flex flex-wrap align-items-center justify-content-between gap-2">
            <h2 id="recently-updated-heading" className="h6 text-body-emphasis mb-0">
              Recently updated
            </h2>
            <Link href="/app/discover/board" className="small text-decoration-none">
              Full board
            </Link>
          </div>
          <ul className="list-group list-group-flush small">
            {recentActivities.length === 0 ? (
              <li className="list-group-item text-body-secondary py-3">
                No discovery activities yet. Add an opportunity in the OST Map below, or use{" "}
                <Link href="/app/discover/workspace" className="text-decoration-none">
                  Workspace
                </Link>{" "}
                to create an activity for an insight.
              </li>
            ) : (
              recentActivities.map((a) => (
                <li
                  key={a.id}
                  className="list-group-item d-flex flex-column flex-md-row gap-1 gap-md-2 align-items-md-center justify-content-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/app/discover/activities/${a.id}`}
                      className="fw-medium text-body-emphasis text-decoration-none text-truncate d-inline-block w-100"
                      style={{ maxWidth: "32rem" }}
                    >
                      {a.title}
                    </Link>
                    <div className="text-body-tertiary" style={{ fontSize: "0.8rem" }}>
                      {a.insightTitle} · {discoveryOstMapActivityStatusLabel(a.status)}
                      {` · `}
                      {a.ownerDisplayLabel}
                    </div>
                  </div>
                  <div
                    className="text-body-tertiary text-nowrap flex-shrink-0"
                    style={{ fontSize: "0.75rem" }}
                  >
                    {formatRelTime(a.updatedAt)}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <DiscoverOstMapPanel mode="embed" data={mapData} canEdit={canEdit} projectName={projectName} />
    </div>
  );
}

function formatRelTime(d: Date): string {
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) {
    return "just now";
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 48) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
