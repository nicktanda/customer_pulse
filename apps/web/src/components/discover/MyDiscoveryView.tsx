import Link from "next/link";
import type { MyDiscoveryActivityRow } from "@customer-pulse/db/queries/discovery";
import { myDiscoveryActivityHints } from "@/lib/discovery-my-queue-hints";
import { discoveryInsightStageBadgeClass, discoveryInsightStageShortLabel } from "@/lib/discovery-insight-stage";

/**
 * Map DiscoveryActivityType (1–7) to a short label — same integers as `packages/db` `enums.ts`.
 */
function activityTypeLabel(type: number): string {
  switch (type) {
    case 1: return "Interview guide";
    case 2: return "Survey";
    case 3: return "Assumption map";
    case 4: return "Competitor scan";
    case 5: return "Data query";
    case 6: return "Desk research";
    case 7: return "Prototype hypothesis";
    default: return "Activity";
  }
}

function statusLabel(status: number): { label: string; badgeClass: string } {
  switch (status) {
    case 1: return { label: "Draft", badgeClass: "bg-body-secondary text-body-secondary border border-secondary-subtle" };
    case 2: return { label: "In progress", badgeClass: "text-bg-warning" };
    case 3: return { label: "Complete", badgeClass: "text-bg-success" };
    case 4: return { label: "Archived", badgeClass: "text-bg-secondary" };
    default: return { label: "Unknown", badgeClass: "text-bg-secondary" };
  }
}

type SectionKey = "draft" | "inProgress" | "complete" | "archived";

const SECTION_ORDER: { key: SectionKey; title: string; match: (s: number) => boolean }[] = [
  { key: "draft", title: "Draft", match: (s) => s === 1 },
  { key: "inProgress", title: "In progress", match: (s) => s === 2 },
  { key: "complete", title: "Complete", match: (s) => s === 3 },
  { key: "archived", title: "Archived", match: (s) => s === 4 },
];

function groupRows(rows: MyDiscoveryActivityRow[]): Record<SectionKey, MyDiscoveryActivityRow[]> {
  const out: Record<SectionKey, MyDiscoveryActivityRow[]> = {
    draft: [],
    inProgress: [],
    complete: [],
    archived: [],
  };
  for (const r of rows) {
    let placed = false;
    for (const { key, match } of SECTION_ORDER) {
      if (match(r.status)) {
        out[key].push(r);
        placed = true;
        break;
      }
    }
    if (!placed) {
      out.inProgress.push(r);
    }
  }
  return out;
}

/**
 * “My discovery” list: sections by activity status, with links to the activity and insight,
 * plus short completeness hints (see `myDiscoveryActivityHints`).
 */
export function MyDiscoveryView({ rows }: { rows: MyDiscoveryActivityRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="card border-secondary-subtle">
        <div className="card-body py-5 text-center text-body-secondary small">
          <p className="mb-2">
            You don&apos;t have any discovery work in this project that matches <strong>My discovery</strong> yet. Add
            activities from an insight, or ask a teammate to assign you.
          </p>
          <div className="d-flex flex-wrap justify-content-center gap-2">
            <Link href="/app/learn/insights" className="btn btn-primary btn-sm">
              Learn — Insights
            </Link>
            <Link href="/app/discover/workspace" className="btn btn-outline-secondary btn-sm">
              Insight workspace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const grouped = groupRows(rows);

  return (
    <div className="d-flex flex-column gap-4">
      {SECTION_ORDER.map(({ key, title }) => {
        const list = grouped[key];
        if (list.length === 0) {
          return null;
        }
        return (
          <section key={key} aria-label={title}>
            <h2 className="h6 text-body-emphasis mb-2">
              {title}
              <span className="text-body-secondary fw-normal small ms-2">({list.length})</span>
            </h2>
            <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
              {list.map((row) => (
                <li key={row.id}>
                  <MyDiscoveryActivityCard row={row} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function MyDiscoveryActivityCard({ row }: { row: MyDiscoveryActivityRow }) {
  const { label: stLabel, badgeClass } = statusLabel(row.status);
  const hints = myDiscoveryActivityHints({
    status: row.status,
    activityType: row.activityType,
    aiGenerated: row.aiGenerated,
    findings: row.findings,
  });

  return (
    <div className="card border-secondary-subtle">
      <div className="card-body py-3 d-flex flex-column flex-sm-row align-items-sm-start justify-content-between gap-3">
        <div className="min-w-0 flex-grow-1">
          <Link
            href={`/app/discover/activities/${row.id}`}
            className="fw-medium text-body-emphasis text-decoration-none d-block"
          >
            {row.title}
          </Link>
          <p className="small text-body-secondary mb-1 mt-1">
            {activityTypeLabel(row.activityType)}
            <span className="text-body-tertiary"> · </span>
            <Link
              href={`/app/discover/insights/${row.insightId}`}
              className="link-secondary text-decoration-none"
            >
              {row.insightTitle}
            </Link>
            <span className="text-body-tertiary"> · </span>
            <span>Owner: {row.ownerDisplayLabel}</span>
          </p>
          {hints.length > 0 ? (
            <ul className="list-unstyled small mb-0 text-body-tertiary" style={{ fontSize: "0.8rem" }}>
              {hints.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="d-flex flex-column align-items-sm-end gap-1 flex-shrink-0">
          <span
            className={`badge ${discoveryInsightStageBadgeClass(row.insightDiscoveryStage)}`}
            style={{ fontSize: "0.65rem" }}
            title="Insight process stage"
          >
            {discoveryInsightStageShortLabel(row.insightDiscoveryStage)}
          </span>
          <span className={`badge ${badgeClass}`} style={{ fontSize: "0.7rem" }}>
            {stLabel}
          </span>
          <Link href={`/app/discover/activities/${row.id}`} className="btn btn-outline-secondary btn-sm">
            Open
          </Link>
        </div>
      </div>
    </div>
  );
}
