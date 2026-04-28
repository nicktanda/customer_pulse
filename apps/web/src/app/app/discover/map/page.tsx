import Link from "next/link";
import { auth } from "@/auth";
import { DiscoverOstMapPanel } from "@/components/discover/DiscoverOstMapPanel";
import { PageShell, ProjectAccessDenied } from "@/components/ui";
import { getRequestDb } from "@/lib/db";
import { getCurrentProjectIdForUser, getCurrentProjectSummaryForUser } from "@/lib/current-project";
import { userCanEditProject, userHasProjectAccess } from "@/lib/project-access";
import { getDiscoveryOstMap } from "@customer-pulse/db/queries/discovery";

/**
 * Dedicated OST (outcome–solution tree) map for the current project. The same diagram is also
 * embedded on `/app/discover` so the overview can show a snapshot without only linking away.
 */
export default async function DiscoverOstMapPage() {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  const projectSummary = await getCurrentProjectSummaryForUser(userId);

  if (projectId == null) {
    return (
      <PageShell width="full">
        <p className="text-body-secondary small mb-0">
          Select a project under <Link href="/app/projects">Settings</Link> to open the OST Map.
        </p>
      </PageShell>
    );
  }

  if (!(await userHasProjectAccess(userId, projectId))) {
    return <ProjectAccessDenied pageTitle="OST Map" />;
  }

  const db = await getRequestDb();
  const data = await getDiscoveryOstMap(db, projectId);
  const canEdit = await userCanEditProject(userId, projectId);

  return (
    <PageShell width="full" className="d-flex flex-column min-h-0 flex-grow-1">
      <DiscoverOstMapPanel
        mode="page"
        data={data}
        canEdit={canEdit}
        projectName={projectSummary?.name ?? data.projectName}
      />
    </PageShell>
  );
}
