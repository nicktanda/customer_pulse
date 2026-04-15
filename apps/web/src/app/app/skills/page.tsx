import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { skills } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject, userHasProjectAccess } from "@/lib/project-access";
import { DeleteSkillButton } from "./DeleteSkillButton";
import { PageHeader, PageShell, ProjectAccessDenied } from "@/components/ui";

export default async function SkillsPage() {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);

  if (projectId == null) {
    return (
      <PageShell width="full">
        <PageHeader title="Skills" description="Select an active project first." />
      </PageShell>
    );
  }

  if (!(await userHasProjectAccess(userId, projectId))) {
    return <ProjectAccessDenied pageTitle="Skills" />;
  }

  const canEdit = await userCanEditProject(userId, projectId);
  const db = getDb();
  const rows = await db
    .select()
    .from(skills)
    .where(eq(skills.projectId, projectId))
    .orderBy(asc(skills.name));

  return (
    <PageShell width="full">
      <PageHeader
        title="Skills"
        description="Reusable PM workflows and analysis templates for this project."
        actions={
          canEdit ? (
            <Link href="/app/skills/new" className="btn btn-primary btn-sm">
              New skill
            </Link>
          ) : null
        }
      />

      <ul className="list-group shadow-sm mt-4">
        {rows.length === 0 ? (
          <li className="list-group-item text-body-secondary small">No skills yet.</li>
        ) : (
          rows.map((s) => (
            <li
              key={s.id}
              className="list-group-item d-flex flex-wrap align-items-center justify-content-between gap-2"
            >
              <div>
                <p className="fw-medium text-body-emphasis mb-0">{s.title}</p>
                <p className="small text-body-secondary mb-0">{s.name}</p>
                {s.description ? (
                  <p className="small text-body-secondary mb-0 mt-1">{s.description}</p>
                ) : null}
              </div>
              {canEdit ? (
                <div className="d-flex gap-3 small">
                  <Link href={`/app/skills/${s.id}/edit`} className="link-primary">
                    Edit
                  </Link>
                  <DeleteSkillButton skillId={s.id} />
                </div>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </PageShell>
  );
}
