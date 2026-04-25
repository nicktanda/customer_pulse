import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { projects, projectUsers } from "@customer-pulse/db/client";
import {
  PageHeader,
  PageShell,
  PeekDrawerPanel,
  PeekPanelNotFound,
  SimplePeekPanelHeader,
} from "@/components/ui";
import { projectsListHref } from "@/lib/projects-list-query";
import { fetchProjectPageData } from "@/lib/project-page-data";
import { ProjectDetailPanel } from "@/components/projects/ProjectDetailPanel";
import { ProjectListCards } from "@/components/projects/ProjectListCards";

/** Project list — user can open this before choosing a current project (no cookie required). */
export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const db = await getRequestDb();
  const sp = await searchParams;
  const detailParsed = Number.parseInt(typeof sp.detail === "string" ? sp.detail : "", 10);
  const detailId = Number.isFinite(detailParsed) && detailParsed > 0 ? detailParsed : null;

  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      isOwner: projectUsers.isOwner,
    })
    .from(projectUsers)
    .innerJoin(projects, eq(projectUsers.projectId, projects.id))
    .where(eq(projectUsers.userId, userId))
    .orderBy(projects.name);

  const closePanelHref = projectsListHref({});
  const rowsForCards = rows.map((p) => ({
    ...p,
    detailHref: projectsListHref({ detail: p.id }),
  }));

  let detailData = null as Awaited<ReturnType<typeof fetchProjectPageData>>;
  if (detailId != null) {
    detailData = await fetchProjectPageData(db, userId, detailId);
  }

  return (
    <PageShell width="full">
      <PageHeader
        title="Projects"
        description="Projects you belong to. Open one to switch context or manage the team."
        actions={
          <Link href="/app/projects/new" className="btn btn-primary btn-sm">
            New project
          </Link>
        }
      />

      <ul className="list-unstyled mb-0 d-flex flex-column gap-2 mt-4">
        {rows.length === 0 ? (
          <li className="text-body-secondary small">
            No projects yet.{" "}
            <Link href="/app/projects/new" className="link-primary">
              Create one
            </Link>
            .
          </li>
        ) : (
          <ProjectListCards rows={rowsForCards} selectedId={detailData?.project.id ?? null} />
        )}
      </ul>

      {detailId != null ? (
        <>
          <Link href={closePanelHref} className="peek-drawer-backdrop" aria-label="Close detail panel" />
          <PeekDrawerPanel storageKey="projects-drawer-width">
            {detailData != null ? (
              <>
                <SimplePeekPanelHeader
                  closeHref={closePanelHref}
                  fullPageHref={`/app/projects/${detailData.project.id}`}
                  entityId={detailData.project.id}
                  title={detailData.project.name}
                  subtitle={detailData.project.slug}
                  entityLinkTitle={`Open project #${detailData.project.id} on its own page`}
                />
                <ProjectDetailPanel data={detailData} projectId={detailData.project.id} showActions />
              </>
            ) : (
              <PeekPanelNotFound
                message="No project found or you don't have access."
                closeHref={closePanelHref}
              />
            )}
          </PeekDrawerPanel>
        </>
      ) : null}
    </PageShell>
  );
}
