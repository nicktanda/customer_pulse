import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { PageHeader, PageShell } from "@/components/ui";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { insights } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userHasProjectAccess } from "@/lib/project-access";
import { getActivitiesByInsight, type ActivityListRow } from "@customer-pulse/db/queries/discovery";
import { insightSeverityLabel, insightTypeLabel } from "@/lib/insight-enums-display";
import { generateDiscoverySummaryAction } from "../../actions";

/**
 * Maps the numeric DiscoveryActivityType integer to a human-readable label and icon character.
 * Values come from DiscoveryActivityType enum in packages/db/src/enums.ts.
 */
function activityTypeLabel(type: number): { label: string; icon: string } {
  switch (type) {
    case 1: return { label: "Interview guide", icon: "💬" };
    case 2: return { label: "Survey", icon: "📋" };
    case 3: return { label: "Assumption map", icon: "🗺" };
    case 4: return { label: "Competitor scan", icon: "🔭" };
    case 5: return { label: "Data query", icon: "📊" };
    case 6: return { label: "Desk research", icon: "📚" };
    case 7: return { label: "Prototype hypothesis", icon: "💡" };
    default: return { label: "Activity", icon: "📝" };
  }
}

/**
 * Maps the numeric DiscoveryActivityStatus to a Bootstrap badge class and label.
 * Values come from DiscoveryActivityStatus enum.
 */
function activityStatusBadge(status: number): { label: string; badgeClass: string } {
  switch (status) {
    case 2: return { label: "In progress", badgeClass: "text-bg-warning" };
    case 3: return { label: "Complete", badgeClass: "text-bg-success" };
    case 4: return { label: "Archived", badgeClass: "text-bg-secondary" };
    default: // 1 = draft
      return { label: "Draft", badgeClass: "bg-body-secondary text-body-secondary border border-secondary-subtle" };
  }
}

/**
 * A single row in the activities list.
 */
function ActivityRow({ activity, insightId }: { activity: ActivityListRow; insightId: number }) {
  const { label, icon } = activityTypeLabel(activity.activityType);
  const { label: statusLabel, badgeClass } = activityStatusBadge(activity.status);

  return (
    <li className="card border-secondary-subtle">
      <div className="card-body d-flex align-items-center justify-content-between gap-3 py-3">
        <div className="min-w-0 d-flex align-items-start gap-2">
          {/* Activity type icon */}
          <span style={{ fontSize: "1.1rem", flexShrink: 0, marginTop: "0.1rem" }} aria-hidden="true">
            {icon}
          </span>
          <div className="min-w-0">
            <Link
              href={`/app/discover/activities/${activity.id}`}
              className="fw-medium text-body-emphasis text-decoration-none"
            >
              {activity.title}
            </Link>
            <div className="d-flex align-items-center gap-2 mt-1 flex-wrap">
              <span className="small text-body-tertiary">{label}</span>
              <span className={`badge ${badgeClass}`} style={{ fontSize: "0.7rem" }}>
                {statusLabel}
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
              {/* Ongoing assumption map: surface that Build should wait for validation to finish. */}
              {activity.activityType === 3 && activity.status !== 3 && activity.status !== 4 ? (
                <span className="badge text-bg-info" style={{ fontSize: "0.65rem" }}>
                  Assumptions in flight
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <Link
          href={`/app/discover/activities/${activity.id}`}
          className="btn btn-outline-secondary btn-sm flex-shrink-0"
        >
          Open
        </Link>
      </div>
    </li>
  );
}

/**
 * Discovery workspace for a single insight.
 *
 * Shows:
 * - Insight title + summary card
 * - AI-generated findings summary (when ?summary= param is present)
 * - All discovery activities for this insight (with status)
 * - "Add activity" dropdown to create a new one
 * - "Create spec" button that links to Build pre-loaded with this insight
 */
export default async function InsightDiscoveryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ summary?: string }>;
}) {
  const { id: idStr } = await params;
  const { summary: summaryParam } = await searchParams;
  const insightId = Number.parseInt(idStr, 10);
  if (!Number.isFinite(insightId)) {
    notFound();
  }

  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);

  if (projectId == null || !(await userHasProjectAccess(userId, projectId))) {
    redirect("/app/discover");
  }

  const db = await getRequestDb();

  // Load the insight row
  const [insight] = await db
    .select()
    .from(insights)
    .where(and(eq(insights.id, insightId), eq(insights.projectId, projectId)))
    .limit(1);

  if (!insight) {
    notFound();
  }

  // Load all discovery activities for this insight
  const activities = await getActivitiesByInsight(db, insightId, projectId);

  const completeCount = activities.filter((a) => a.status === 3).length;

  // Determine "Create spec" button state messaging
  let specCtaLabel = "Create spec";
  let specCtaClass = "btn btn-outline-secondary btn-sm";
  if (activities.length === 0) {
    specCtaLabel = "Create spec (no discovery yet)";
  } else if (completeCount === 0) {
    specCtaLabel = "Create spec (discovery in progress)";
  } else {
    specCtaLabel = `Create spec (${completeCount} complete ✓)`;
    specCtaClass = "btn btn-primary btn-sm";
  }

  return (
    <PageShell width="full">
      <PageHeader
        title={insight.title}
        description={`Discovery workspace · ${activities.length} ${activities.length === 1 ? "activity" : "activities"}`}
        back={{ href: "/app/discover/insights", label: "Discovery" }}
        actions={
          <div className="d-flex gap-2 flex-wrap">
            <Link
              href={`/app/build/specs/new?from_insight=${insight.id}`}
              className={specCtaClass}
            >
              {specCtaLabel}
            </Link>
          </div>
        }
      />

      {/* Insight context card — shows the insight's type, severity, and description */}
      <div
        className="card border-secondary-subtle mb-4"
        style={{ background: "rgba(var(--bs-primary-rgb), 0.04)" }}
      >
        <div className="card-body py-3">
          <div className="d-flex flex-wrap gap-2 mb-2">
            <span className="badge rounded-pill text-bg-light border">
              {insightTypeLabel(insight.insightType)}
            </span>
            <span className="badge rounded-pill text-bg-light border">
              {insightSeverityLabel(insight.severity)}
            </span>
            {insight.affectedUsersCount > 0 ? (
              <span className="badge rounded-pill text-bg-light border">
                ~{insight.affectedUsersCount} affected users
              </span>
            ) : null}
          </div>
          <p className="small text-body-secondary mb-2">{insight.description}</p>
          <Link
            href={`/app/learn/insights/${insight.id}`}
            className="small link-secondary text-decoration-none"
          >
            View full insight in Learn →
          </Link>
        </div>
      </div>

      {/* AI findings summary — shown when ?summary= param is set by generateDiscoverySummaryAction */}
      {summaryParam ? (
        <div
          className="card border-secondary-subtle mb-4"
          style={{ borderLeft: "3px solid var(--bs-primary) !important" }}
        >
          <div className="card-body py-3">
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="small fw-semibold text-body-emphasis">Discovery summary</span>
              <span
                className="badge border"
                style={{
                  fontSize: "0.65rem",
                  background: "rgba(var(--bs-primary-rgb), 0.08)",
                  color: "var(--bs-primary)",
                  borderColor: "rgba(var(--bs-primary-rgb), 0.2)",
                }}
              >
                AI drafted
              </span>
            </div>
            <p className="small text-body mb-0" style={{ lineHeight: 1.7 }}>
              {decodeURIComponent(summaryParam)}
            </p>
          </div>
        </div>
      ) : completeCount > 0 ? (
        /* Offer to generate a summary when there are complete activities but no summary yet */
        <div className="card border-secondary-subtle mb-4">
          <div className="card-body py-3 d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div>
              <p className="small fw-medium text-body-emphasis mb-0">
                {completeCount} {completeCount === 1 ? "activity" : "activities"} complete
              </p>
              <p className="small text-body-secondary mb-0">
                Generate an AI summary of your findings before creating a spec.
              </p>
            </div>
            <form action={generateDiscoverySummaryAction}>
              <input type="hidden" name="insight_id" value={insightId} />
              <button type="submit" className="btn btn-outline-primary btn-sm flex-shrink-0">
                Generate summary
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* Activities list header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="h6 fw-semibold mb-0 text-body-emphasis">Discovery activities</h2>
        {/* Add activity dropdown — each type maps to a query param handled by /new */}
        <div className="dropdown">
          <button
            className="btn btn-primary btn-sm dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            + Add activity
          </button>
          <ul className="dropdown-menu dropdown-menu-end shadow-sm">
            <li>
              <Link
                className="dropdown-item"
                href={`/app/discover/insights/${insightId}/new?type=1`}
              >
                💬 Interview guide
              </Link>
            </li>
            <li>
              <Link
                className="dropdown-item"
                href={`/app/discover/insights/${insightId}/new?type=2`}
              >
                📋 Survey
              </Link>
            </li>
            <li>
              <Link
                className="dropdown-item"
                href={`/app/discover/insights/${insightId}/new?type=3`}
              >
                🗺 Assumption map
              </Link>
            </li>
            <li>
              <Link
                className="dropdown-item"
                href={`/app/discover/insights/${insightId}/new?type=4`}
              >
                🔭 Competitor scan
              </Link>
            </li>
            <li>
              <Link
                className="dropdown-item"
                href={`/app/discover/insights/${insightId}/new?type=5`}
              >
                📊 Data query
              </Link>
            </li>
            <li>
              <Link
                className="dropdown-item"
                href={`/app/discover/insights/${insightId}/new?type=6`}
              >
                📚 Desk research
              </Link>
            </li>
            <li>
              <Link
                className="dropdown-item"
                href={`/app/discover/insights/${insightId}/new?type=7`}
              >
                💡 Prototype hypothesis
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Activities list or empty state */}
      {activities.length === 0 ? (
        <div className="card border-secondary-subtle">
          <div className="card-body py-5 text-center">
            <p className="fw-semibold text-body-emphasis mb-1">No activities yet</p>
            <p className="small text-body-secondary mb-3">
              Add an interview guide, survey, or competitor scan to start validating this insight
              before writing a spec.
            </p>
            <Link
              href={`/app/discover/insights/${insightId}/new?type=1`}
              className="btn btn-primary btn-sm"
            >
              Add interview guide
            </Link>
          </div>
        </div>
      ) : (
        <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
          {activities.map((activity) => (
            <ActivityRow key={activity.id} activity={activity} insightId={insightId} />
          ))}
        </ul>
      )}
    </PageShell>
  );
}
