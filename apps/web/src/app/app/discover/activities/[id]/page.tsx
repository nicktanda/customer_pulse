import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { PageHeader, PageShell } from "@/components/ui";
import { DiscoveryActivityWorkspace } from "@/components/discovery/DiscoveryActivityWorkspace";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { insights } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject, userHasProjectAccess } from "@/lib/project-access";
import { getActivityById, getActivityOwnerDisplayLabel } from "@customer-pulse/db/queries/discovery";
import { listProjectMemberUsersForAssignment } from "@customer-pulse/db/queries/project-members";
import { setDiscoveryActivityAssigneeAction } from "../../actions";
import { discoveryInsightStageLabel } from "@/lib/discovery-insight-stage";

/**
 * Returns the human-readable label for an activity type integer.
 */
function activityTypeLabel(type: number): string {
  const labels: Record<number, string> = {
    1: "Interview guide",
    2: "Survey",
    3: "Assumption map",
    4: "Competitor scan",
    5: "Data query",
    6: "Desk research",
    7: "Prototype hypothesis",
  };
  return labels[type] ?? "Discovery activity";
}

/**
 * Full-page activity view — same two-column UI as the insight workspace, with breadcrumb chrome.
 */
export default async function ActivityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ note?: string }>;
}) {
  const { id: idStr } = await params;
  const { note: noteParam } = await searchParams;
  const activityId = Number.parseInt(idStr, 10);
  if (!Number.isFinite(activityId)) {
    notFound();
  }

  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);

  if (projectId == null || !(await userHasProjectAccess(userId, projectId))) {
    redirect("/app/discover");
  }

  const canEdit = await userCanEditProject(userId, projectId);
  const db = await getRequestDb();
  const activity = await getActivityById(db, activityId, projectId);

  if (!activity) {
    notFound();
  }

  const [insight] = await db
    .select({ id: insights.id, title: insights.title })
    .from(insights)
    .where(and(eq(insights.id, activity.insightId), eq(insights.projectId, projectId)))
    .limit(1);

  // Same label logic as the board: assignee override, else insight’s discovery lead, else unassigned.
  const effectiveOwnerLabel = await getActivityOwnerDisplayLabel(db, activity);
  const memberOptions = canEdit ? await listProjectMemberUsersForAssignment(db, projectId) : [];

  const isAssumptionMap = activity.activityType === 3;
  const showEmptyFindingsNote = noteParam === "empty_findings" && isAssumptionMap;

  return (
    <PageShell width="full">
      <PageHeader
        title={activity.title}
        description={
          <>
            {activityTypeLabel(activity.activityType)}
            {insight ? (
              <>
                {" · "}
                <Link
                  href={`/app/discover/insights/${insight.id}`}
                  className="text-body-secondary text-decoration-none"
                >
                  {insight.title}
                </Link>
              </>
            ) : null}
          </>
        }
        back={{
          href: insight ? `/app/discover/insights/${insight.id}` : "/app/discover/insights",
          label: insight ? "Back to insight" : "Discovery",
        }}
        actions={
          <Link
            href={`/app/discover/workspace?insight=${activity.insightId}`}
            className="btn btn-outline-primary btn-sm"
          >
            All tools in workspace
          </Link>
        }
      />

      {/* Who owns this card: activity assignee, or the insight’s default lead from the insight page. */}
      <div className="card border-secondary-subtle mb-3">
        <div className="card-body py-3">
          <p className="small fw-semibold text-body-emphasis mb-1">Owner</p>
          <p className="small text-body-secondary mb-0">
            Effective: <span className="text-body-emphasis">{effectiveOwnerLabel}</span>
            {activity.assigneeId == null && activity.insightDiscoveryLeadId == null ? (
              <>
                {" "}
                — set an <strong>assignee</strong> here or a <strong>discovery lead</strong> on the{" "}
                <Link href={`/app/discover/insights/${activity.insightId}`} className="link-secondary">
                  insight
                </Link>
                .
              </>
            ) : null}
          </p>
          <p className="small text-body-secondary mt-2 mb-0">
            Insight process:{" "}
            <span className="text-body-emphasis">
              {discoveryInsightStageLabel(activity.insightDiscoveryStage)}
            </span>
            {canEdit ? (
              <>
                {" "}
                — set on the{" "}
                <Link href={`/app/discover/insights/${activity.insightId}`} className="link-secondary">
                  insight
                </Link>{" "}
                page.
              </>
            ) : null}
          </p>
          {canEdit ? (
            <form action={setDiscoveryActivityAssigneeAction} className="mt-2 d-flex flex-wrap align-items-end gap-2">
              <input type="hidden" name="activity_id" value={String(activity.id)} />
              <div className="flex-grow-1" style={{ minWidth: "12rem" }}>
                <label htmlFor="assignee" className="form-label small mb-0 text-body-secondary">
                  Assign to (overrides insight lead when set)
                </label>
                <select
                  id="assignee"
                  name="assignee_id"
                  className="form-select form-select-sm"
                  defaultValue={activity.assigneeId != null ? String(activity.assigneeId) : ""}
                  aria-label="Assign this discovery activity to a project member"
                >
                  <option value="">Inherit from insight lead</option>
                  {memberOptions.map((m) => (
                    <option key={m.id} value={String(m.id)}>
                      {m.name?.trim() || m.email}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-sm btn-primary">
                Save assignee
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <DiscoveryActivityWorkspace
        activity={activity}
        insightTitle={insight?.title ?? null}
        showEmptyFindingsNote={showEmptyFindingsNote}
        toolbar={
          <p className="small text-body-secondary mb-0">
            Prefer one screen for every tool?{" "}
            <Link href={`/app/discover/workspace?insight=${activity.insightId}`} className="fw-medium">
              Open insight workspace
            </Link>{" "}
            for this insight.
          </p>
        }
      />
    </PageShell>
  );
}
