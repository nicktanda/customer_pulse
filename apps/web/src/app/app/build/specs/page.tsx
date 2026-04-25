import Link from "next/link";
import { auth } from "@/auth";
import { PageHeader, PageShell, ProjectAccessDenied } from "@/components/ui";
import { getRequestDb } from "@/lib/db";
import { getCurrentProjectIdForUser, getCurrentProjectSummaryForUser } from "@/lib/current-project";
import { userHasProjectAccess } from "@/lib/project-access";
import { getSpecsByProject, type SpecListRow } from "@customer-pulse/db/queries/specs";
import { formatAppDate } from "@/lib/format-app-date";

/**
 * Maps the numeric SpecStatus integer to a display label and Bootstrap badge class.
 *
 * Status values (from SpecStatus enum in enums.ts):
 *   0 = backlog  1 = drafting  2 = review  3 = ready  4 = in_progress  5 = shipped
 */
function specStatusBadge(status: number): { label: string; badgeClass: string } {
  switch (status) {
    case 1:
      return { label: "Drafting", badgeClass: "text-bg-warning" };
    case 2:
      return { label: "Review", badgeClass: "text-bg-info" };
    case 3:
      return { label: "Ready", badgeClass: "text-bg-primary" };
    case 4:
      return { label: "In progress", badgeClass: "text-bg-secondary" };
    case 5:
      return { label: "Shipped", badgeClass: "text-bg-success" };
    default:
      // 0 = backlog (and any unknown future value)
      return { label: "Backlog", badgeClass: "bg-body-secondary text-body-secondary border border-secondary-subtle" };
  }
}

/**
 * A single spec card row in the list.
 * Extracted as a sub-component to keep the page component readable.
 */
function SpecCard({ spec }: { spec: SpecListRow }) {
  const { label, badgeClass } = specStatusBadge(spec.status);
  return (
    <li className="card border-secondary-subtle">
      <div className="card-body d-flex align-items-center justify-content-between gap-3 py-3">
        {/* Left side: title + status badge + insight count + date */}
        <div className="min-w-0">
          <Link
            href={`/app/build/specs/${spec.id}`}
            className="fw-medium text-body-emphasis text-decoration-none"
          >
            {spec.title}
          </Link>
          <div className="d-flex align-items-center gap-2 mt-1 flex-wrap">
            <span className={`badge ${badgeClass}`}>{label}</span>
            {spec.insightCount > 0 ? (
              <span className="small text-body-secondary">
                {spec.insightCount} insight{spec.insightCount !== 1 ? "s" : ""} linked
              </span>
            ) : (
              <span className="small text-body-tertiary">No insights linked</span>
            )}
            <span className="small text-body-tertiary">{formatAppDate(spec.createdAt)}</span>
          </div>
        </div>

        {/* Right side: open button */}
        <Link
          href={`/app/build/specs/${spec.id}`}
          className="btn btn-outline-secondary btn-sm flex-shrink-0"
        >
          Open
        </Link>
      </div>
    </li>
  );
}

/**
 * Spec list page — shows every spec for the current project, newest first.
 *
 * Empty state copy from mode-design-decisions.md decision #4:
 * "No specs yet. Go to Learn → Insights and click Create spec on any insight."
 */
export default async function SpecsPage() {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  const projectSummary = await getCurrentProjectSummaryForUser(userId);

  if (projectId == null) {
    return (
      <PageShell width="full">
        <PageHeader
          title="Specs"
          description="Select an active project under Settings to see specs."
        />
      </PageShell>
    );
  }

  if (!(await userHasProjectAccess(userId, projectId))) {
    return <ProjectAccessDenied pageTitle="Specs" />;
  }

  const db = await getRequestDb();
  const rows = await getSpecsByProject(db, projectId);

  return (
    <PageShell width="full">
      <PageHeader
        title="Specs"
        description={
          projectSummary
            ? `Specs for ${projectSummary.name}`
            : "All specs for the current project"
        }
        // l6: "New spec" button in the header, linking to /app/build/specs/new
        actions={
          <Link href="/app/build/specs/new" className="btn btn-primary btn-sm">
            New spec
          </Link>
        }
      />

      {/* l2: empty state pointing back to Learn → Insights */}
      {rows.length === 0 ? (
        <div className="card border-secondary-subtle">
          <div className="card-body py-5 text-center">
            <p className="fw-semibold text-body-emphasis mb-1">No specs yet</p>
            <p className="small text-body-secondary mb-3">
              Go to{" "}
              <Link href="/app/learn/insights" className="link-primary fw-medium">
                Learn → Insights
              </Link>{" "}
              and click <strong>Create spec</strong> on any insight.
            </p>
            <Link href="/app/learn/insights" className="btn btn-primary btn-sm">
              Open Insights
            </Link>
          </div>
        </div>
      ) : (
        <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
          {rows.map((spec) => (
            <SpecCard key={spec.id} spec={spec} />
          ))}
        </ul>
      )}
    </PageShell>
  );
}
