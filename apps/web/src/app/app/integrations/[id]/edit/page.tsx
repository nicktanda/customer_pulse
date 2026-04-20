import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { integrations } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject, userHasProjectAccess } from "@/lib/project-access";
import { INTEGRATION_SOURCE_LABELS } from "@/lib/integration-source-meta";
import { updateIntegrationAction } from "../../actions";
import { FormActions, InlineAlert, NarrowCardForm, PageHeader, PageShell } from "@/components/ui";

export default async function IntegrationEditPage({
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
    redirect("/app/integrations");
  }
  if (!(await userCanEditProject(userId, projectId))) {
    redirect(`/app/integrations/${id}`);
  }

  const db = await getRequestDb();
  const [row] = await db.select().from(integrations).where(eq(integrations.id, id)).limit(1);
  if (!row || row.projectId !== projectId) {
    notFound();
  }

  const sp = await searchParams;
  const err = typeof sp.error === "string" ? sp.error : null;

  return (
    <PageShell width="narrow">
      <PageHeader
        title="Edit integration"
        description={`${INTEGRATION_SOURCE_LABELS[row.sourceType] ?? row.sourceType} — leave credentials empty to keep existing secrets.`}
        back={{ href: `/app/integrations/${id}`, label: row.name }}
      />
      {err === "json" ? <InlineAlert variant="danger">Invalid JSON.</InlineAlert> : null}

      <NarrowCardForm action={updateIntegrationAction.bind(null, id)} className="mt-4">
        <div>
          <label htmlFor="edit-int-name" className="form-label">
            Name
          </label>
          <input
            id="edit-int-name"
            name="name"
            required
            defaultValue={row.name}
            className="form-control"
          />
        </div>
        <div className="form-check">
          <input
            type="checkbox"
            name="enabled"
            value="true"
            defaultChecked={row.enabled}
            className="form-check-input"
            id="edit-int-enabled"
          />
          <label className="form-check-label" htmlFor="edit-int-enabled">
            Enabled
          </label>
        </div>
        <div>
          <label htmlFor="edit-int-creds" className="form-label">
            Replace credentials JSON (optional)
          </label>
          <textarea
            id="edit-int-creds"
            name="credentials_json"
            rows={6}
            className="form-control font-monospace small"
            placeholder="Leave blank to keep current encrypted credentials"
          />
        </div>
        <div>
          <label htmlFor="edit-int-wh" className="form-label">
            Webhook secret (optional — replaces if non-empty)
          </label>
          <input id="edit-int-wh" name="webhook_secret" className="form-control" />
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
