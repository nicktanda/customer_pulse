import Link from "next/link";
import { DeleteProjectButton } from "@/app/app/projects/DeleteProjectButton";
import { MetricTile } from "@/components/ui";
import type { ProjectPageData } from "@/lib/project-page-data";

/**
 * Project summary + counts; optional action row for the list `?detail=` panel (full page keeps actions in PageHeader).
 */
export function ProjectDetailPanel({
  data,
  projectId,
  showActions = false,
}: {
  data: ProjectPageData;
  projectId: number;
  /** When true, show Switch / Team / Edit / Delete under the stats (used in the right-hand panel). */
  showActions?: boolean;
}) {
  const { project, isOwner, feedbackCount, integrationCount, insightCount, ideaCount } = data;

  return (
    <>
      {project.description ? <p className="text-body-secondary mb-0">{project.description}</p> : null}

      <section className="row g-3 mt-4">
        <MetricTile label="Feedback" value={feedbackCount} />
        <MetricTile label="Integrations" value={integrationCount} />
        <MetricTile label="Insights" value={insightCount} />
        <MetricTile label="Ideas" value={ideaCount} />
      </section>

      {showActions ? (
        <div className="d-flex flex-wrap gap-2 mt-4">
          <Link href={`/app/set-project?id=${projectId}`} className="btn btn-outline-secondary btn-sm">
            Switch to this project
          </Link>
          {isOwner ? (
            <>
              <Link href={`/app/projects/${projectId}/members`} className="btn btn-outline-secondary btn-sm">
                Team
              </Link>
              <Link href={`/app/projects/${projectId}/edit`} className="btn btn-outline-secondary btn-sm">
                Edit
              </Link>
              <DeleteProjectButton projectId={projectId} />
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
