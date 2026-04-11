import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { integrations, IntegrationSourceType, UserRole } from "@customer-pulse/db/client";
import {
  getCurrentProjectIdForUser,
  getCurrentProjectSummaryForUser,
  listUserProjects,
} from "@/lib/current-project";
import { ProjectSwitcher } from "../ProjectSwitcher";
import { userCanEditProject, userHasProjectAccess } from "@/lib/project-access";
import { decryptCredentialsColumn } from "@customer-pulse/db/lockbox";
import { projectHasDemoSeedData } from "@/lib/demo-project-seed";
import { saveGithubSettingsAction } from "./actions";
import { DemoModeSwitch } from "./DemoModeSwitch";
import {
  FormActions,
  InlineAlert,
  PageHeader,
  PageShell,
  ProjectAccessDenied,
} from "@/components/ui";

/** Read-only defaults for this card until per-project settings are persisted in the DB. */
const DEFAULT_SETTINGS = {
  pulse_send_time: "09:00",
  ai_processing_interval_hours: 4,
  default_priority: "unset",
  auto_archive_days: 30,
  github_auto_merge: false,
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const userId = Number(session?.user?.id);
  // Same list the old sidebar switcher used — needed for the Settings dropdown and for empty-state copy.
  const userProjects = await listUserProjects(userId);
  const projectId = await getCurrentProjectIdForUser(userId);
  const projectSummary = await getCurrentProjectSummaryForUser(userId);
  const sp = await searchParams;
  const notice = typeof sp.notice === "string" ? sp.notice : null;
  const err = typeof sp.error === "string" ? sp.error : null;

  if (projectId == null) {
    return (
      <PageShell width="medium" className="d-flex flex-column gap-5">
        <PageHeader
          title="Settings"
          description="Create a project under Projects, then choose which workspace is active below."
        />
        <section className="card shadow-sm border-secondary-subtle">
          <div className="card-body">
            <h2 className="h5 text-body-emphasis">Active project</h2>
            <p className="small text-body-secondary mt-1 mb-3">
              The app shows one project at a time (feedback, integrations, reports). Use the menu below once you belong
              to a project.
            </p>
            <ProjectSwitcher projects={userProjects} currentProjectId={null} showLabel={false} />
          </div>
        </section>
      </PageShell>
    );
  }

  if (!(await userHasProjectAccess(userId, projectId))) {
    return <ProjectAccessDenied pageTitle="Settings" />;
  }

  const canEdit = await userCanEditProject(userId, projectId);
  const isAdmin = session?.user?.role === UserRole.admin;
  // Server action still checks this; we always show the card to admins so they know demo mode exists and how to enable it.
  const demoSeedEnabled = process.env.ALLOW_DEMO_DATA_SEED === "true";
  const showDemoModeCard = canEdit && isAdmin;

  const db = getDb();
  const [gh] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.projectId, projectId), eq(integrations.sourceType, IntegrationSourceType.github)))
    .limit(1);

  let ghPreview: { owner?: string; repo?: string; default_branch?: string } = {};
  const masterKey = process.env.LOCKBOX_MASTER_KEY;
  if (gh?.credentialsCiphertext && masterKey) {
    try {
      const raw = decryptCredentialsColumn(gh.credentialsCiphertext, masterKey);
      ghPreview = JSON.parse(raw) as typeof ghPreview;
    } catch {
      ghPreview = {};
    }
  }

  // Demo mode is “on” when tagged demo feedback exists (same tag the seed uses in `raw_data`).
  const demoModeOn = showDemoModeCard ? await projectHasDemoSeedData(db, projectId) : false;

  return (
    <PageShell width="medium" className="d-flex flex-column gap-5">
      <PageHeader
        title="Settings"
        description={
          <>
            <span className="fw-medium">{projectSummary?.name ?? `Project #${projectId}`}</span>
            {projectSummary?.slug ? <span className="text-body-secondary"> · {projectSummary.slug}</span> : null}
          </>
        }
      />

      <section className="card shadow-sm border-secondary-subtle">
        <div className="card-body">
          <h2 className="h5 text-body-emphasis">Active project</h2>
          <p className="small text-body-secondary mt-1 mb-3">
            Dashboard, Feedback, integrations, and reports all use one project at a time. Pick a different workspace here
            and the app reloads so every screen matches.
          </p>
          <ProjectSwitcher projects={userProjects} currentProjectId={projectId} showLabel={false} />
        </div>
      </section>

      {notice === "github" ? (
        <InlineAlert variant="success">GitHub integration saved.</InlineAlert>
      ) : null}
      {err === "github_token" ? (
        <InlineAlert variant="danger">GitHub access token is required.</InlineAlert>
      ) : null}
      {notice === "demo_on" || notice === "demo" ? (
        <InlineAlert variant="success">
          Demo mode is on: synthetic data is loaded for this project. Refresh other open tabs if counts look stale.
          Turn the switch off anytime to remove only the demo-tagged rows.
        </InlineAlert>
      ) : null}
      {notice === "demo_off" ? (
        <InlineAlert variant="success">
          Demo mode is off: synthetic demo rows were removed from this project. Your real data was not deleted.
        </InlineAlert>
      ) : null}
      {err === "demo_disabled" ? (
        <InlineAlert variant="warning">
          Demo seed is turned off (set <code className="px-1 rounded bg-body-secondary">ALLOW_DEMO_DATA_SEED=true</code>{" "}
          in your env and restart the server).
        </InlineAlert>
      ) : null}
      {err === "demo_forbidden" ? (
        <InlineAlert variant="danger">Only admins can load demo data for this project.</InlineAlert>
      ) : null}
      {err === "demo_noproject" ? (
        <InlineAlert variant="warning">
          Choose an active project with the dropdown at the top of this page, then try again.
        </InlineAlert>
      ) : null}

      {showDemoModeCard ? (
        <section className="card shadow-sm border-secondary-subtle border-warning-subtle">
          <div className="card-body">
            <h2 className="h5 text-body-emphasis">Demo mode</h2>
            <p className="small text-body-secondary mt-1 mb-3">
              When on, fills the <span className="fw-medium">current project</span> with realistic-looking synthetic
              feedback, pulse reports, themes, insights, strategy text, email recipients, and disabled &quot;Demo:&quot;
              integrations. Everything is tagged in the database; turning the switch off removes only those demo rows
              (your real integrations and feedback stay). Turning it on again replaces the previous demo set.
            </p>
            {!demoSeedEnabled ? (
              <InlineAlert variant="warning" className="mb-3" role="status">
                <strong>Demo seed is off on this server.</strong> Add{" "}
                <code className="px-1 rounded bg-body-secondary">ALLOW_DEMO_DATA_SEED=true</code> to the repo root{" "}
                <code className="px-1 rounded bg-body-secondary">.env</code> or{" "}
                <code className="px-1 rounded bg-body-secondary">apps/web/.env.local</code> (see{" "}
                <code className="px-1 rounded bg-body-secondary">.env.example</code>), then restart{" "}
                <code className="px-1 rounded bg-body-secondary">yarn dev</code> so the switch can run.
              </InlineAlert>
            ) : null}
            <DemoModeSwitch initiallyOn={demoModeOn} actionsEnabled={demoSeedEnabled} />
          </div>
        </section>
      ) : null}

      <section className="card shadow-sm border-secondary-subtle">
        <div className="card-body">
          <h2 className="h5 text-body-emphasis">Scheduled jobs &amp; defaults</h2>
          <p className="small text-body-secondary mt-1 mb-0">
            Pulse send time, AI batch interval, and related defaults are controlled by your deployment (environment and
            worker configuration), not this screen. The values below are what the app uses today so you can see them at
            a glance.
          </p>
          <dl className="row small mt-3 mb-0 g-2">
            {Object.entries(DEFAULT_SETTINGS).map(([k, v]) => (
              <div key={k} className="col-sm-6">
                <dt className="text-body-secondary">{k}</dt>
                <dd className="fw-medium mb-0">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="card shadow-sm border-secondary-subtle">
        <div className="card-body">
          <h2 className="h5 text-body-emphasis">GitHub</h2>
          <p className="small text-body-secondary mt-1">
            Used for PR automation and related features. Credentials are stored as an encrypted integration for this
            project.
          </p>
          {canEdit ? (
            <form action={saveGithubSettingsAction} className="mt-3 d-flex flex-column gap-3">
              <div>
                <label htmlFor="gh-token" className="form-label">
                  Access token
                </label>
                <input
                  id="gh-token"
                  name="access_token"
                  type="password"
                  autoComplete="off"
                  required={!gh}
                  className="form-control"
                  placeholder={gh ? "Leave blank to keep the existing token" : "ghp_…"}
                />
                {gh ? (
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
                <input
                  id="gh-owner"
                  name="owner"
                  defaultValue={ghPreview.owner ?? ""}
                  className="form-control"
                />
              </div>
              <div>
                <label htmlFor="gh-repo" className="form-label">
                  Repo
                </label>
                <input id="gh-repo" name="repo" defaultValue={ghPreview.repo ?? ""} className="form-control" />
              </div>
              <div>
                <label htmlFor="gh-branch" className="form-label">
                  Default branch
                </label>
                <input
                  id="gh-branch"
                  name="default_branch"
                  defaultValue={ghPreview.default_branch ?? "main"}
                  className="form-control"
                />
              </div>
              <div className="form-check">
                <input
                  type="checkbox"
                  name="enabled"
                  value="true"
                  defaultChecked={gh?.enabled ?? true}
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
            </form>
          ) : (
            <p className="small text-body-secondary mt-3 mb-0">You do not have permission to change GitHub settings.</p>
          )}
        </div>
      </section>
    </PageShell>
  );
}
