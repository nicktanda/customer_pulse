import Link from "next/link";
import { auth } from "@/auth";
import { PageHeader, PageShell, ProjectAccessDenied } from "@/components/ui";
import { getRequestDb } from "@/lib/db";
import { getCurrentProjectIdForUser, getCurrentProjectSummaryForUser } from "@/lib/current-project";
import { userHasProjectAccess } from "@/lib/project-access";
import { getInsightsWithDiscovery, type InsightDiscoverySummaryRow } from "@customer-pulse/db/queries/discovery";

/**
 * A single row card in the "insights with discovery" list.
 */
function InsightDiscoveryCard({ row }: { row: InsightDiscoverySummaryRow }) {
  return (
    <li className="card border-secondary-subtle">
      <div className="card-body d-flex align-items-center justify-content-between gap-3 py-3">
        <div className="min-w-0">
          <Link
            href={`/app/discover/insights/${row.insightId}`}
            className="fw-medium text-body-emphasis text-decoration-none"
          >
            {row.insightTitle}
          </Link>
          <div className="d-flex align-items-center gap-2 mt-1 flex-wrap">
            {/* Total activities count */}
            <span className="small text-body-secondary">
              {row.activityCount} {row.activityCount === 1 ? "activity" : "activities"}
            </span>
            {/* Completed activities */}
            {row.completeCount > 0 ? (
              <span className="badge text-bg-success" style={{ fontSize: "0.7rem" }}>
                {row.completeCount} complete
              </span>
            ) : (
              <span className="badge bg-body-secondary text-body-secondary border border-secondary-subtle" style={{ fontSize: "0.7rem" }}>
                In progress
              </span>
            )}
          </div>
        </div>

        <Link
          href={`/app/discover/insights/${row.insightId}`}
          className="btn btn-outline-secondary btn-sm flex-shrink-0"
        >
          Open
        </Link>
      </div>
    </li>
  );
}

/**
 * Lists all insights that have at least one discovery activity for the current project.
 * Empty state directs the user to Learn → Insights to start their first activity.
 */
export default async function DiscoverInsightsPage() {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  const projectSummary = await getCurrentProjectSummaryForUser(userId);

  if (projectId == null) {
    return (
      <PageShell width="full">
        <PageHeader
          title="Discovery Activities"
          description="Select an active project under Settings to see discovery activities."
        />
      </PageShell>
    );
  }

  if (!(await userHasProjectAccess(userId, projectId))) {
    return <ProjectAccessDenied pageTitle="Discovery Activities" />;
  }

  const db = await getRequestDb();
  const rows = await getInsightsWithDiscovery(db, projectId);

  return (
    <PageShell width="full">
      <PageHeader
        title="Discovery Activities"
        description={
          projectSummary
            ? `Validating insights for ${projectSummary.name}`
            : "Insights with active discovery work"
        }
        back={{ href: "/app/discover", label: "Discover" }}
        actions={
          <Link href="/app/learn/insights" className="btn btn-outline-secondary btn-sm">
            Browse all Insights
          </Link>
        }
      />

      {rows.length === 0 ? (
        <div className="card border-secondary-subtle">
          <div className="card-body py-5 text-center">
            <p className="fw-semibold text-body-emphasis mb-1">No discovery activities yet</p>
            <p className="small text-body-secondary mb-3">
              Go to{" "}
              <Link href="/app/learn/insights" className="link-primary fw-medium">
                Learn → Insights
              </Link>{" "}
              and click <strong>Start Discovery</strong> on any insight to begin validating it.
            </p>
            <Link href="/app/learn/insights" className="btn btn-primary btn-sm">
              Open Insights
            </Link>
          </div>
        </div>
      ) : (
        <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
          {rows.map((row) => (
            <InsightDiscoveryCard key={row.insightId} row={row} />
          ))}
        </ul>
      )}
    </PageShell>
  );
}
