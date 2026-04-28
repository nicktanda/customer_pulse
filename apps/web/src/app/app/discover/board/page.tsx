import { auth } from "@/auth";
import { PageHeader, PageShell, ProjectAccessDenied } from "@/components/ui";
import { DiscoveryBoardView } from "@/components/discover/DiscoveryBoardView";
import { getRequestDb } from "@/lib/db";
import { getCurrentProjectIdForUser, getCurrentProjectSummaryForUser } from "@/lib/current-project";
import {
  BOARD_STATUS_COLUMNS,
  boardColumnLabel,
  parseBoardColumnParam,
  parseBoardInsightParam,
  parseBoardOwnerParam,
  toBoardSearchParams,
} from "@/lib/discovery-board";
import { listDiscoveryActivitiesForBoard } from "@customer-pulse/db/queries/discovery";
import { listProjectMemberUsersForAssignment } from "@customer-pulse/db/queries/project-members";
import { userCanEditProject, userHasProjectAccess } from "@/lib/project-access";

/**
 * All discovery work for the current project, shown as a simple Kanban by status.
 * `?insight=<id>` limits the board to one insight; `?owner=` filters by owner; `?column=1-4` limits
 * to one **activity status** column (same names as the Kanban: Draft → Archived).
 */
export default async function DiscoveryBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ insight?: string; owner?: string; column?: string }>;
}) {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  const projectSummary = await getCurrentProjectSummaryForUser(userId);
  const sp = await searchParams;
  const insightFilter = parseBoardInsightParam(typeof sp.insight === "string" ? sp.insight : undefined);
  const ownerFilter = parseBoardOwnerParam(typeof sp.owner === "string" ? sp.owner : undefined);
  const columnFilter = parseBoardColumnParam(typeof sp.column === "string" ? sp.column : undefined);

  if (projectId == null) {
    return (
      <PageShell width="full">
        <PageHeader
          title="Discovery board"
          description="Select an active project under Settings to see the discovery board."
        />
      </PageShell>
    );
  }

  if (!(await userHasProjectAccess(userId, projectId))) {
    return <ProjectAccessDenied pageTitle="Discovery board" />;
  }

  const db = await getRequestDb();
  const listOpts = {
    insightId: insightFilter,
    ...(ownerFilter.kind === "unassigned"
      ? { onlyUnassigned: true as const }
      : ownerFilter.kind === "user"
        ? { effectiveOwnerUserId: ownerFilter.userId }
        : {}),
    ...(columnFilter.kind === "column" ? { activityStatus: columnFilter.column } : {}),
  };
  const rows = await listDiscoveryActivitiesForBoard(db, projectId, listOpts);
  const canEdit = await userCanEditProject(userId, projectId);
  const members = await listProjectMemberUsersForAssignment(db, projectId);

  return (
    <PageShell width="full">
      <PageHeader
        title="Discovery board"
        description={
          projectSummary
            ? `${projectSummary.name} — all discovery activities by status`
            : "All discovery activities in this project, grouped by status"
        }
        back={{ href: "/app/discover", label: "Discover" }}
      />

      <p className="text-body-secondary small mb-4" style={{ maxWidth: "40rem" }}>
        Each card is a discovery activity. Open a card to work in the full workspace, or use{" "}
        <strong>Status</strong> and <strong>Update</strong> to move it between columns. The{" "}
        <strong>Archived</strong> column is for work you are parking — it is not the same as
        &quot;Complete&quot;.
        {insightFilter != null ? (
          <>
            {" "}
            Showing activities for one insight (filter:{" "}
            <a
              className="link-primary"
              href={`/app/discover/board${toBoardSearchParams({ owner: ownerFilter, column: columnFilter })}`}
            >
              clear
            </a>
            ).
          </>
        ) : null}
        {ownerFilter.kind !== "all" ? (
          <>
            {" "}
            Owner filter:{" "}
            {ownerFilter.kind === "unassigned" ? (
              <span className="fw-medium">unassigned</span>
            ) : (
              <span className="fw-medium">one teammate</span>
            )}{" "}
            (
            <a
              className="link-primary"
              href={`/app/discover/board${toBoardSearchParams({
                insightId: insightFilter,
                owner: { kind: "all" },
                column: columnFilter,
              })}`}
            >
              clear owner
            </a>
            ).
          </>
        ) : null}
        {columnFilter.kind === "column" ? (
          <>
            {" "}
            Column filter:{" "}
            <span className="fw-medium">{boardColumnLabel[columnFilter.column]}</span> (
            <a
              className="link-primary"
              href={`/app/discover/board${toBoardSearchParams({
                insightId: insightFilter,
                owner: ownerFilter,
                column: { kind: "all" },
              })}`}
            >
              clear column
            </a>
            ).
          </>
        ) : null}
      </p>

      {/*
        GET form: `insight` (optional), `owner`, and `column` (activity status 1–4) combine so you
        can e.g. show only “In progress” for one insight.
      */}
      <form
        method="get"
        action="/app/discover/board"
        className="d-flex flex-wrap align-items-end gap-2 mb-4"
        aria-label="Filter discovery board"
      >
        {insightFilter != null ? <input type="hidden" name="insight" value={String(insightFilter)} /> : null}
        <div>
          <label htmlFor="board-owner-filter" className="form-label small mb-0 text-body-secondary">
            Owner
          </label>
          <select
            id="board-owner-filter"
            name="owner"
            className="form-select form-select-sm"
            defaultValue={
              ownerFilter.kind === "unassigned"
                ? "unassigned"
                : ownerFilter.kind === "user"
                  ? String(ownerFilter.userId)
                  : ""
            }
            style={{ minWidth: "12rem" }}
          >
            <option value="">All teammates</option>
            <option value="unassigned">Unassigned (no lead & no assignee)</option>
            {members.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.name?.trim() || m.email}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="board-column-filter" className="form-label small mb-0 text-body-secondary">
            Column
          </label>
          <select
            id="board-column-filter"
            name="column"
            className="form-select form-select-sm"
            defaultValue={columnFilter.kind === "column" ? String(columnFilter.column) : ""}
            style={{ minWidth: "11rem" }}
            aria-label="Show activities only in this Kanban column (activity status)"
          >
            <option value="">All columns</option>
            {BOARD_STATUS_COLUMNS.map((col) => (
              <option key={col} value={String(col)}>
                {boardColumnLabel[col]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-sm btn-outline-secondary">
          Apply
        </button>
      </form>

      <DiscoveryBoardView rows={rows} canEdit={canEdit} filteredInsightId={insightFilter} />
    </PageShell>
  );
}
