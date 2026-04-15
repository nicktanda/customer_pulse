import Link from "next/link";
import { PageHeader } from "./PageHeader";
import { PageShell } from "./PageShell";

/**
 * Shown when the user has a current project cookie but is not a member of that project
 * (e.g. removed from the team). Avoids a blank main area with no explanation.
 */
export function ProjectAccessDenied({ pageTitle }: { pageTitle: string }) {
  return (
    <PageShell width="medium">
      <PageHeader title={pageTitle} description="You don’t have access to this project." />
      <div className="card border-secondary-subtle shadow-sm mt-3">
        <div className="card-body">
          <p className="small text-body-secondary mb-3">
            Your account is no longer on this project, or the active project was switched. Choose another project on{" "}
            <Link href="/app/settings" className="fw-medium">
              Settings
            </Link>
            , or open the project list to see what you can access.
          </p>
          <div className="d-flex flex-wrap gap-2">
            <Link href="/app/settings" className="btn btn-primary btn-sm">
              Open settings
            </Link>
            <Link href="/app/projects" className="btn btn-outline-primary btn-sm">
              View projects
            </Link>
            <Link href="/app" className="btn btn-outline-secondary btn-sm">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
