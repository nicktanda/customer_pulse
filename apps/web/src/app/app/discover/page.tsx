import Link from "next/link";
import { auth } from "@/auth";
import { PageHeader, PageShell, ProjectAccessDenied } from "@/components/ui";
import { DiscoverInsightPicker } from "@/components/discover/DiscoverInsightPicker";
import { getRequestDb } from "@/lib/db";
import { getCurrentProjectIdForUser, getCurrentProjectSummaryForUser } from "@/lib/current-project";
import { userHasProjectAccess } from "@/lib/project-access";
import { listInsightTitlesForProject } from "@customer-pulse/db/queries/discovery";
import { DiscoverHomeToolSections } from "./DiscoverHomeToolSections";

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ insight?: string; note?: string }>;
}) {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  const project = await getCurrentProjectSummaryForUser(userId);
  const sp = await searchParams;
  const insightParam = typeof sp.insight === "string" ? sp.insight : undefined;
  const noteParam = typeof sp.note === "string" ? sp.note : undefined;
  const insightId = insightParam ? Number.parseInt(insightParam, 10) : NaN;
  const hasValidInsight = Number.isFinite(insightId);

  if (projectId == null) {
    return (
      <PageShell width="full">
        <PageHeader
          title="Discover"
          description="Select or create a project first."
          back={{ href: "/app/projects", label: "Projects" }}
        />
      </PageShell>
    );
  }

  if (!(await userHasProjectAccess(userId, projectId))) {
    return <ProjectAccessDenied pageTitle="Discover" />;
  }

  const db = await getRequestDb();
  const insightOptions = await listInsightTitlesForProject(db, projectId);
  const selectedInsight = hasValidInsight ? insightOptions.find((i) => i.id === insightId) : undefined;

  return (
    <PageShell width="full">
      <PageHeader
        title="Discover"
        description={project ? `${project.name} — validate before you build` : "Validate before you build"}
        actions={
          <Link href="/app/discover/insights" className="btn btn-outline-secondary btn-sm">
            Insights in discovery
          </Link>
        }
      />

      <p className="text-body-secondary small mb-4" style={{ maxWidth: "40rem" }}>
        Pick an insight once, then use all four tools on this page — interview guide, survey, assumption map, and
        competitor scan. Each tool has its own AI draft and findings panel; everything still links to the same insight
        for your spec trail in Build.
      </p>

      <DiscoverInsightPicker insights={insightOptions} value={hasValidInsight && selectedInsight ? String(insightId) : ""} />

      {noteParam === "empty_findings" && hasValidInsight && selectedInsight ? (
        <div className="alert alert-info d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 mb-4">
          <p className="small mb-0">
            You marked an <strong>assumption map</strong> complete without notes in <strong>Your findings</strong>. That
            is fine — add learnings anytime by clicking <strong>Reopen</strong> on that tool.
          </p>
          <Link className="btn btn-sm btn-outline-info text-nowrap" href={`/app/discover?insight=${insightId}`}>
            Dismiss
          </Link>
        </div>
      ) : null}

      {!hasValidInsight || !selectedInsight ? (
        <div className="card border-secondary-subtle">
          <div className="card-body py-5 text-center text-body-secondary small">
            {insightOptions.length === 0 ? (
              <p className="mb-2">
                No insights in this project yet. Generate or import feedback in Learn, then come back here.
              </p>
            ) : (
              <p className="mb-0">Select an insight above to load the four discovery tools on this page.</p>
            )}
            <Link href="/app/learn/insights" className="btn btn-primary btn-sm mt-3">
              Open Learn insights
            </Link>
          </div>
        </div>
      ) : (
        <DiscoverHomeToolSections insightId={insightId} projectId={projectId} insightTitle={selectedInsight.title} />
      )}
    </PageShell>
  );
}
