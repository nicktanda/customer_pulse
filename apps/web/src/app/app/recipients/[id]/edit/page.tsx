import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { emailRecipients } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject, userHasProjectAccess } from "@/lib/project-access";
import { updateRecipientAction } from "../../actions";
import { FormActions, NarrowCardForm, PageHeader, PageShell } from "@/components/ui";

export default async function EditRecipientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number.parseInt(idStr, 10);
  if (!Number.isFinite(id)) {
    notFound();
  }

  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  if (projectId == null || !(await userHasProjectAccess(userId, projectId))) {
    redirect("/app/recipients");
  }
  if (!(await userCanEditProject(userId, projectId))) {
    redirect("/app/recipients");
  }

  const db = await getRequestDb();
  const [row] = await db
    .select()
    .from(emailRecipients)
    .where(and(eq(emailRecipients.id, id), eq(emailRecipients.projectId, projectId)))
    .limit(1);
  if (!row) {
    notFound();
  }

  return (
    <PageShell width="narrow">
      <PageHeader title="Edit recipient" back={{ href: "/app/recipients", label: "Recipients" }} />
      <NarrowCardForm action={updateRecipientAction.bind(null, id)} className="mt-4">
        <div>
          <label htmlFor="edit-recipient-email" className="form-label">
            Email
          </label>
          <input
            id="edit-recipient-email"
            name="email"
            type="email"
            required
            defaultValue={row.email}
            className="form-control"
          />
        </div>
        <div>
          <label htmlFor="edit-recipient-name" className="form-label">
            Name
          </label>
          <input id="edit-recipient-name" name="name" defaultValue={row.name ?? ""} className="form-control" />
        </div>
        <div className="form-check">
          <input
            type="checkbox"
            name="active"
            value="true"
            defaultChecked={row.active}
            className="form-check-input"
            id="edit-recipient-active"
          />
          <label className="form-check-label" htmlFor="edit-recipient-active">
            Active
          </label>
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
