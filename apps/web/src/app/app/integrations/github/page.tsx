import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { integrations, IntegrationSourceType } from "@customer-pulse/db/client";
import { decryptCredentialsColumn } from "@customer-pulse/db/lockbox";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { userCanEditProject, userHasProjectAccess } from "@/lib/project-access";
import { saveGithubIntegrationAction } from "../actions";
import { GithubTestButton } from "./GithubTestButton";
import {
  FormActions,
  InlineAlert,
  NarrowCardForm,
  PageHeader,
  PageShell,
  ProjectAccessDenied,
} from "@/components/ui";

export default async function GithubIntegrationPage({
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
        <PageHeader title="GitHub" description="Select a project to continue." />
      </PageShell>
    );
  }

  if (!(await userHasProjectAccess(userId, projectId))) {
    return <ProjectAccessDenied pageTitle="GitHub" />;
  }

  const canEdit = await userCanEditProject(userId, projectId);
  const db = await getRequestDb();
  const [row] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.projectId, projectId), eq(integrations.sourceType, IntegrationSourceType.github)))
    .limit(1);

  let preview: { owner?: string; repo?: string; default_branch?: string } = {};
  let decryptFailed = false;
  const masterKey = process.env.LOCKBOX_MASTER_KEY;
  if (row?.credentialsCiphertext && masterKey) {
    try {
      const raw = decryptCredentialsColumn(row.credentialsCiphertext, masterKey);
      preview = JSON.parse(raw) as typeof preview;
    } catch {
      decryptFailed = true;
    }
  }

  return (
    <PageShell width="narrow">
      <PageHeader
        title="GitHub"
        description="Token + repo used for PR automation. Credentials are encrypted at rest."
        back={{ href: "/app/integrations", label: "Integrations" }}
      />
      {notice === "saved" ? <InlineAlert variant="success">GitHub integration saved.</InlineAlert> : null}
      {err === "token" ? <InlineAlert variant="danger">GitHub access token is required.</InlineAlert> : null}
      {decryptFailed ? (
        <InlineAlert variant="warning">
          Stored credentials could not be decrypted with the current LOCKBOX_MASTER_KEY. Re-enter the token and repo
          details below to overwrite them.
        </InlineAlert>
      ) : null}

      {canEdit ? (
        <NarrowCardForm action={saveGithubIntegrationAction} className="mt-4">
          <div>
            <label htmlFor="gh-token" className="form-label">
              Access token
            </label>
            <input
              id="gh-token"
              name="access_token"
              type="password"
              autoComplete="off"
              required={!row || decryptFailed}
              className="form-control"
              placeholder={row && !decryptFailed ? "Leave blank to keep the existing token" : "ghp_…"}
            />
            {row && !decryptFailed ? (
              <p className="form-text small text-body-secondary mb-0">
                Leave blank to keep your current token and only update owner, repo, or branch.
              </p>
            ) : (
              <p className="form-text small text-body-secondary mb-0">
                Paste a personal access token with the scopes your automation needs.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="gh-owner" className="form-label">
              Owner
            </label>
            <input id="gh-owner" name="owner" defaultValue={preview.owner ?? ""} className="form-control" />
          </div>
          <div>
            <label htmlFor="gh-repo" className="form-label">
              Repo
            </label>
            <input id="gh-repo" name="repo" defaultValue={preview.repo ?? ""} className="form-control" />
          </div>
          <div>
            <label htmlFor="gh-branch" className="form-label">
              Default branch
            </label>
            <input
              id="gh-branch"
              name="default_branch"
              defaultValue={preview.default_branch ?? "main"}
              className="form-control"
            />
          </div>
          <div className="form-check">
            <input
              type="checkbox"
              name="enabled"
              value="true"
              defaultChecked={row?.enabled ?? true}
              className="form-check-input"
              id="gh-enabled"
            />
            <label className="form-check-label" htmlFor="gh-enabled">
              Enabled
            </label>
          </div>
          <FormActions variant="plain">
            <button type="submit" className="btn btn-primary">
              Save GitHub
            </button>
          </FormActions>
          <div className="mt-2">
            <GithubTestButton />
          </div>
        </NarrowCardForm>
      ) : (
        <p className="small text-body-secondary mt-4 mb-0">You do not have permission to change GitHub settings.</p>
      )}
    </PageShell>
  );
}
