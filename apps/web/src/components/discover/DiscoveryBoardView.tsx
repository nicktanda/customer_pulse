import Link from "next/link";
import type { DiscoveryBoardActivityRow } from "@customer-pulse/db/queries/discovery";
import { setDiscoveryActivityStatusAction } from "@/app/app/discover/actions";
import {
  BOARD_STATUS_COLUMNS,
  boardColumnLabel,
  type BoardStatusColumn,
  groupBoardActivitiesByStatus,
} from "@/lib/discovery-board";
import {
  discoveryInsightStageBadgeClass,
  discoveryInsightStageShortLabel,
} from "@/lib/discovery-insight-stage";

/**
 * Map DiscoveryActivityType (1–7) to a short label; integers match packages/db `enums.ts`.
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

type Props = {
  rows: DiscoveryBoardActivityRow[];
  canEdit: boolean;
  /** When set, the page was opened with `?insight=` — we show a scoped empty state if the list is empty. */
  filteredInsightId?: number;
};

/**
 * Project-wide discovery Kanban: four columns for status 1–4 (draft → in progress →
 * complete → archived). The `status` integer on each row is the same field used on the
 * insight activity list and activity detail pages; changing it here calls the same update path.
 */
export function DiscoveryBoardView({ rows, canEdit, filteredInsightId }: Props) {
  const byStatus = groupBoardActivitiesByStatus(rows);

  if (rows.length === 0) {
    return (
      <div className="card border-secondary-subtle">
        <div className="card-body py-5 text-center">
          <p className="fw-semibold text-body-emphasis mb-1">
            {filteredInsightId != null ? "No activities for this insight" : "No discovery activities yet"}
          </p>
          <p className="small text-body-secondary mb-0">
            {filteredInsightId != null ? (
              <>
                This insight has no activities, or the filter id was wrong.{" "}
                <Link className="link-primary" href="/app/discover/board">
                  Clear the insight filter
                </Link>{" "}
                to see the full board.
              </>
            ) : (
              <>
                Go to{" "}
                <Link href="/app/learn/insights" className="link-primary fw-medium">
                  Learn → Insights
                </Link>{" "}
                and click <strong>Start Discovery</strong> on an insight, or open an insight and add
                an activity.
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="d-flex flex-column flex-lg-row gap-3 align-items-stretch"
      style={{ minHeight: "12rem" }}
    >
      {BOARD_STATUS_COLUMNS.map((statusKey) => (
        <BoardColumn
          key={statusKey}
          statusKey={statusKey}
          activities={byStatus[statusKey]}
          canEdit={canEdit}
        />
      ))}
    </div>
  );
}

function BoardColumn({
  statusKey,
  activities,
  canEdit,
}: {
  statusKey: BoardStatusColumn;
  activities: DiscoveryBoardActivityRow[];
  canEdit: boolean;
}) {
  const isArchived = statusKey === 4;
  const label = boardColumnLabel[statusKey];
  return (
    <div
      className={`d-flex flex-column flex-grow-1 min-w-0 ${isArchived ? "opacity-90" : ""}`}
      style={{ flexBasis: 0, minWidth: "12rem" }}
    >
      <div
        className={`d-flex align-items-baseline justify-content-between gap-2 mb-2 px-1 ${isArchived ? "text-body-secondary" : ""}`}
      >
        <h2 className="h6 mb-0">{label}</h2>
        <span className="small text-body-secondary tabular-nums">{activities.length}</span>
      </div>
      <div
        className={`flex-grow-1 rounded border p-2 d-flex flex-column gap-2 ${
          isArchived ? "border-secondary-subtle bg-body-secondary" : "border-secondary-subtle bg-body"
        }`}
        style={{ minHeight: "6rem" }}
      >
        {activities.length === 0 ? (
          <p className="small text-body-secondary text-center py-3 mb-0">No activities here</p>
        ) : (
          activities.map((a) => (
            <BoardCard key={a.id} activity={a} canEdit={canEdit} currentColumn={statusKey} />
          ))
        )}
      </div>
    </div>
  );
}

function BoardCard({
  activity,
  canEdit,
  currentColumn,
}: {
  activity: DiscoveryBoardActivityRow;
  canEdit: boolean;
  currentColumn: BoardStatusColumn;
}) {
  const typeName = activityTypeLabel(activity.activityType);
  return (
    <div className="card border-secondary-subtle shadow-sm">
      <div className="card-body p-2 p-sm-3">
        <Link
          href={`/app/discover/activities/${activity.id}`}
          className="fw-medium text-body-emphasis text-decoration-none d-block"
        >
          {activity.title}
        </Link>
        <p className="small text-body-secondary mt-1 mb-2">
          <Link
            href={`/app/discover/insights/${activity.insightId}`}
            className="text-decoration-none text-body-secondary"
          >
            {activity.insightTitle}
          </Link>
        </p>
        <p className="small text-body-tertiary mb-1" style={{ fontSize: "0.7rem" }}>
          Owner: <span className="text-body-secondary">{activity.ownerDisplayLabel}</span>
        </p>
        <p className="small mb-2">
          <span
            className={`badge ${discoveryInsightStageBadgeClass(activity.insightDiscoveryStage)}`}
            style={{ fontSize: "0.65rem" }}
            title="Insight process stage (set on the insight page)"
          >
            {discoveryInsightStageShortLabel(activity.insightDiscoveryStage)}
          </span>
        </p>
        <div className="d-flex align-items-center flex-wrap gap-1">
          <span className="badge bg-body-secondary text-body border border-secondary-subtle" style={{ fontSize: "0.65rem" }}>
            {typeName}
          </span>
          {activity.aiGenerated ? (
            <span
              className="badge border"
              style={{
                fontSize: "0.65rem",
                background: "rgba(var(--bs-primary-rgb), 0.08)",
                color: "var(--bs-primary)",
                borderColor: "rgba(var(--bs-primary-rgb), 0.2) !important",
              }}
            >
              AI drafted
            </span>
          ) : null}
        </div>
        {canEdit ? (
          // Plain HTML form → server action: works without JavaScript; Next.js will POST and refresh the RSC tree.
          <form action={setDiscoveryActivityStatusAction} className="mt-2 d-flex flex-column gap-1">
            <input type="hidden" name="activity_id" value={String(activity.id)} />
            <label className="small text-body-secondary mb-0" htmlFor={`status-${activity.id}`}>
              Status
            </label>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <select
                id={`status-${activity.id}`}
                name="next_status"
                className="form-select form-select-sm"
                defaultValue={String(currentColumn)}
                aria-label={`Change status for ${activity.title}`}
              >
                <option value="1">Draft</option>
                <option value="2">In progress</option>
                <option value="3">Complete</option>
                <option value="4">Archived</option>
              </select>
              <button type="submit" className="btn btn-sm btn-outline-secondary">
                Update
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
