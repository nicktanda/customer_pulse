import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { skills } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject, userHasProjectAccess } from "@/lib/project-access";
import { updateSkillAction } from "../../actions";
import { FormActions, InlineAlert, NarrowCardForm, PageHeader, PageShell } from "@/components/ui";

export default async function EditSkillPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id: idStr } = await params;
  const id = Number.parseInt(idStr, 10);
  if (!Number.isFinite(id)) {
    notFound();
  }

  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  if (projectId == null || !(await userHasProjectAccess(userId, projectId))) {
    redirect("/app/skills");
  }
  if (!(await userCanEditProject(userId, projectId))) {
    redirect("/app/skills");
  }

  const db = getDb();
  const [row] = await db
    .select()
    .from(skills)
    .where(and(eq(skills.id, id), eq(skills.projectId, projectId)))
    .limit(1);
  if (!row) {
    notFound();
  }

  const sp = await searchParams;
  const err = typeof sp.error === "string" ? sp.error : null;

  return (
    <PageShell width="narrow">
      <PageHeader title="Edit skill" back={{ href: "/app/skills", label: "Skills" }} />
      {err === "dup" ? (
        <InlineAlert variant="danger">A skill with that name already exists.</InlineAlert>
      ) : null}
      {err === "required" ? (
        <InlineAlert variant="danger">Name, title, and content are required.</InlineAlert>
      ) : null}
      <NarrowCardForm action={updateSkillAction.bind(null, id)} className="mt-4">
        <div>
          <label htmlFor="edit-skill-name" className="form-label">
            Name
          </label>
          <input id="edit-skill-name" name="name" required defaultValue={row.name} className="form-control" />
        </div>
        <div>
          <label htmlFor="edit-skill-title" className="form-label">
            Title
          </label>
          <input id="edit-skill-title" name="title" required defaultValue={row.title} className="form-control" />
        </div>
        <div>
          <label htmlFor="edit-skill-description" className="form-label">
            Description (optional)
          </label>
          <input id="edit-skill-description" name="description" defaultValue={row.description ?? ""} className="form-control" />
        </div>
        <div>
          <label htmlFor="edit-skill-content" className="form-label">
            Content
          </label>
          <textarea id="edit-skill-content" name="content" required rows={10} defaultValue={row.content} className="form-control" />
        </div>
        <FormActions variant="plain">
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </FormActions>
      </NarrowCardForm>
    </PageShell>
  );
}
