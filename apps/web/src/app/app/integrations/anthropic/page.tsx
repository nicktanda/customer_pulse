import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { integrations } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject, userHasProjectAccess } from "@/lib/project-access";
import { saveAnthropicIntegrationAction } from "../actions";
import {
  FormActions,
  InlineAlert,
  NarrowCardForm,
  PageHeader,
  PageShell,
  ProjectAccessDenied,
} from "@/components/ui";

const ANTHROPIC_SOURCE_TYPE = 13;

export default async function AnthropicIntegrationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  const sp = await searchParams;
  const notice = typeof sp.notice === "string" ? sp.notice : null;
  const err = typeof sp.error === "string" ? sp.error : null;

  if (projectId == null) {
    return (
      <PageShell width="narrow">
        <PageHeader title="Anthropic" description="Select a project to continue." />
      </PageShell>
    );
  }

  if (!(await userHasProjectAccess(userId, projectId))) {
    return <ProjectAccessDenied pageTitle="Anthropic" />;
  }

  const canEdit = await userCanEditProject(userId, projectId);
  const db = await getRequestDb();
  const [row] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.projectId, projectId), eq(integrations.sourceType, ANTHROPIC_SOURCE_TYPE)))
    .limit(1);

  return (
    <PageShell width="narrow">
      <PageHeader
        title="Anthropic"
        description="API key used for AI-powered feedback classification, insight discovery, and reporting."
        back={{ href: "/app/integrations", label: "Integrations" }}
      />
      {notice === "saved" ? <InlineAlert variant="success">Anthropic API key saved.</InlineAlert> : null}
      {err === "key" ? <InlineAlert variant="danger">Anthropic API key is required.</InlineAlert> : null}

      {canEdit ? (
        <NarrowCardForm action={saveAnthropicIntegrationAction} className="mt-4">
          <div>
            <label htmlFor="anthropic-key" className="form-label">
              API key
            </label>
            <input
              id="anthropic-key"
              name="api_key"
              type="password"
              autoComplete="off"
              required={!row}
              className="form-control"
              placeholder={row ? "Leave blank to keep existing key" : "sk-ant-…"}
            />
            {row ? (
              <p className="form-text small text-body-secondary mb-0">
                Key is saved. Enter a new one to replace it.
              </p>
            ) : null}
          </div>
          <FormActions variant="plain">
            <button type="submit" className="btn btn-primary">
              Save Anthropic key
            </button>
          </FormActions>
        </NarrowCardForm>
      ) : (
        <p className="small text-body-secondary mt-4 mb-0">
          {row ? "Anthropic API key is configured." : "No API key set — ask a project admin to configure it."}
        </p>
      )}
    </PageShell>
  );
}
