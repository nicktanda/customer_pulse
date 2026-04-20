import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { userHasProjectAccess } from "@/lib/project-access";
import { DeleteProjectButton } from "../DeleteProjectButton";
import { PageHeader, PageShell } from "@/components/ui";
import { fetchProjectPageData } from "@/lib/project-page-data";
import { ProjectDetailPanel } from "@/components/projects/ProjectDetailPanel";

export default async function ProjectShowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const projectId = Number.parseInt(idStr, 10);
  if (!Number.isFinite(projectId)) {
    notFound();
  }

  const session = await auth();
  const userId = Number(session?.user?.id);
  if (!(await userHasProjectAccess(userId, projectId))) {
    redirect("/app/projects");
  }

  const db = await getRequestDb();
  const data = await fetchProjectPageData(db, userId, projectId);
  if (!data) {
    notFound();
  }

  const { project, isOwner } = data;

  return (
    <PageShell width="full">
      <PageHeader
        title={project.name}
        description={project.slug}
        back={{ href: "/app/projects", label: "Projects" }}
        actions={
          <>
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
          </>
        }
      />

      <ProjectDetailPanel data={data} projectId={projectId} showActions={false} />
    </PageShell>
  );
}
