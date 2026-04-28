import Link from "next/link";
import { auth } from "@/auth";
import { PageHeader, PageShell, ProjectAccessDenied } from "@/components/ui";
import { MyDiscoveryView } from "@/components/discover/MyDiscoveryView";
import { getRequestDb } from "@/lib/db";
import { getCurrentProjectIdForUser, getCurrentProjectSummaryForUser } from "@/lib/current-project";
import { userHasProjectAccess } from "@/lib/project-access";
import { listMyDiscoveryActivitiesForUser } from "@customer-pulse/db/queries/discovery";

/**
 * Stage 2 — “My discovery”: activities **you created** in this project (`created_by` = you).
 * Later, Stage 3 assignee can broaden “my work” without changing this page’s structure much.
 */
export default async function MyDiscoveryPage() {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  const project = await getCurrentProjectSummaryForUser(userId);

  if (projectId == null) {
    return (
      <PageShell width="full">
        <PageHeader
          title="My discovery"
          description="Select or create a project first."
          back={{ href: "/app/projects", label: "Projects" }}
        />
      </PageShell>
    );
  }

  if (!(await userHasProjectAccess(userId, projectId))) {
    return <ProjectAccessDenied pageTitle="My discovery" />;
  }

  const db = await getRequestDb();
  const rows = await listMyDiscoveryActivitiesForUser(db, projectId, userId);

  return (
    <PageShell width="full">
      <PageHeader
        title="My discovery"
        description={
          project
            ? `${project.name} — discovery activities you created in this project`
            : "Discovery activities you created in this project"
        }
        back={{ href: "/app/discover", label: "Discover" }}
        actions={
          <Link href="/app/discover/board" className="btn btn-outline-secondary btn-sm">
            Full board
          </Link>
        }
      />

      <p className="text-body-secondary small mb-4" style={{ maxWidth: "44rem" }}>
        Shows activities where you are the <strong>assignee</strong>, or the <strong>insight discovery lead</strong> when
        no one is assigned, or you <strong>created</strong> the activity when there is no lead. Grouped by status with
        simple hints (no AI draft, no findings, etc.).
      </p>

      <MyDiscoveryView rows={rows} />
    </PageShell>
  );
}
