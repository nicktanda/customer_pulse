import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DiscoverHubContent } from "@/components/discover/DiscoverHubContent";
import { DiscoveryChatSidebar } from "@/components/discover/DiscoveryChatSidebar";
import { PageHeader, PageShell, ProjectAccessDenied } from "@/components/ui";
import { getRequestDb } from "@/lib/db";
import { getCurrentProjectIdForUser, getCurrentProjectSummaryForUser } from "@/lib/current-project";
import { userCanEditProject, userHasProjectAccess } from "@/lib/project-access";
import { buildWhosDoingWhatGroups } from "@/lib/discovery-whos-doing-what";
import {
  getDiscoveryActivityStatusCounts,
  getDiscoveryOstMap,
  listDiscoveryActivitiesForBoard,
  listMyDiscoveryActivitiesForUser,
} from "@customer-pulse/db/queries/discovery";

/**
 * Discover *hub* — one landing page: at-a-glance stats, who owns what, recent activity, then the
 * OST map, plus a compact in-page “Go to” list (aligned with the sidebar). See `DiscoverHubContent`.
 *
 * If someone bookmarked the old `?insight=` or `?note=` query on this path, we forward them to
 * the workspace so their link keeps working. The full OST map also has its own route at
 * `/app/discover/map` — the same view is embedded below on this page.
 */
export default async function DiscoverHubPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  // Preserve legacy links: previously `/app/discover?insight=1&note=...` opened the tool workspace.
  const insightQ = sp.insight;
  const noteQ = sp.note;
  const hasWorkspaceQuery =
    (typeof insightQ === "string" && insightQ.length > 0) || typeof noteQ === "string";
  if (hasWorkspaceQuery) {
    const q = new URLSearchParams();
    if (typeof insightQ === "string") {
      q.set("insight", insightQ);
    }
    if (typeof noteQ === "string") {
      q.set("note", noteQ);
    }
    redirect(`/app/discover/workspace?${q.toString()}`);
  }

  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  const project = await getCurrentProjectSummaryForUser(userId);

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
  // Run these queries in parallel so the page waits once instead of several round-trips.
  const [mapData, statusCounts, recentActivities, forWhosDoingWhat, myQueueRows, canEdit] =
    await Promise.all([
      getDiscoveryOstMap(db, projectId),
      getDiscoveryActivityStatusCounts(db, projectId),
      // Same ordering as the full board, but only the 6 most recently updated rows.
      listDiscoveryActivitiesForBoard(db, projectId, { limit: 6 }),
      // For "Who's doing what" — up to 200 *active* (non-archived) rows, then we group in memory.
      listDiscoveryActivitiesForBoard(db, projectId, { excludeArchived: true, limit: 200 }),
      listMyDiscoveryActivitiesForUser(db, projectId, userId),
      userCanEditProject(userId, projectId),
    ]);

  // One subsection per person (assignee, else insight lead, else unassigned), capped for the hub UI.
  const whosDoingWhat = buildWhosDoingWhatGroups(forWhosDoingWhat, { perPersonMax: 4, maxGroups: 12 });

  // OST map opportunity count = insight nodes in the tree (one per insight with map data).
  const opportunityCount = mapData.insightGroups.length;
  const myQueueCount = myQueueRows.length;

  return (
    <PageShell width="full" className="d-flex flex-column min-h-0">
      <PageHeader
        title="Discover"
        description={
          project
            ? `${project.name} — validate insights and plan experiments before you commit work in Build`
            : "Validate insights and plan experiments before you commit work in Build"
        }
      />

      <div className="mt-4">
        <DiscoverHubContent
          projectName={mapData.projectName}
          mapData={mapData}
          canEdit={canEdit}
          statusCounts={statusCounts}
          opportunityCount={opportunityCount}
          myQueueCount={myQueueCount}
          recentActivities={recentActivities}
          whosDoingWhat={whosDoingWhat}
        />
      </div>
      <DiscoveryChatSidebar />
    </PageShell>
  );
}
