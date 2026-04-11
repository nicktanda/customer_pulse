import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { projects } from "@customer-pulse/db/client";
import { userIsProjectOwner } from "@/lib/project-access";
import { ProjectEditForm } from "../../ProjectForm";
import { PageHeader, PageShell } from "@/components/ui";

export default async function ProjectEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const projectId = Number.parseInt(idStr, 10);
  if (!Number.isFinite(projectId)) {
    notFound();
  }

  const session = await auth();
  const userId = Number(session?.user?.id);
  if (!(await userIsProjectOwner(userId, projectId))) {
    redirect(`/app/projects/${projectId}`);
  }

  const db = getDb();
  const [proj] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!proj) {
    notFound();
  }

  return (
    <PageShell width="narrow">
      <PageHeader
        title="Edit project"
        back={{ href: `/app/projects/${projectId}`, label: proj.name }}
      />
      <ProjectEditForm projectId={projectId} defaultName={proj.name} defaultDescription={proj.description} />
    </PageShell>
  );
}
