import { redirect } from "next/navigation";
import { FormActions, InlineAlert, NarrowCardForm, PageHeader, PageShell } from "@/components/ui";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import {
  users,
  projects,
  projectUsers,
  integrations,
  emailRecipients,
  IntegrationSourceType,
} from "@customer-pulse/db/client";
import { decryptCredentialsColumn } from "@customer-pulse/db/lockbox";
import { ONBOARDING_STEPS, humanOnboardingStepTitle } from "@/lib/onboarding-steps";
import { onboardingDispatchAction, onboardingGoBackAction, onboardingSkipAction } from "./actions";
import { IntegrationStepClient, GitHubStepClient, AnthropicStepClient } from "./IntegrationStepClient";
import { ProjectStepClient } from "./ProjectStepClient";
import { RecipientsStepClient } from "./RecipientsStepClient";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = Number(session.user.id);
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (user?.onboardingCompletedAt) {
    redirect("/app");
  }

  const sp = await searchParams;
  const err = typeof sp.error === "string" ? sp.error : null;
  const errMsg =
    err === "project_name"
      ? "Project name is required."
      : err === "anthropic_env"
        ? "Set ANTHROPIC_API_KEY in your environment (or click Skip for now)."
        : err === "json"
          ? "Credentials must be valid JSON."
          : err === "noproject"
            ? "Create a project first."
            : null;

  const step = user?.onboardingCurrentStep ?? "welcome";
  const stepIndex = Math.max(0, ONBOARDING_STEPS.indexOf(step as (typeof ONBOARDING_STEPS)[number]));

  // Load existing data so going back shows what was saved
  const [puRow] = await db
    .select({ projectId: projectUsers.projectId })
    .from(projectUsers)
    .where(eq(projectUsers.userId, userId))
    .limit(1);
  const projectId = puRow?.projectId ?? null;

  let savedProject: { name: string } | null = null;
  if (projectId) {
    const [p] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, projectId)).limit(1);
    savedProject = p ?? null;
  }

  // Load saved integrations for the project (to show "configured" state)
  const savedIntegrations: Record<string, boolean> = {};
  if (projectId) {
    const rows = await db
      .select({ sourceType: integrations.sourceType })
      .from(integrations)
      .where(eq(integrations.projectId, projectId));
    const sourceMap: Record<number, string> = {
      [IntegrationSourceType.linear]: "linear",
      [IntegrationSourceType.slack]: "slack",
      [IntegrationSourceType.jira]: "jira",
      [IntegrationSourceType.google_forms]: "google_forms",
      [IntegrationSourceType.logrocket]: "logrocket",
      [IntegrationSourceType.fullstory]: "fullstory",
      [IntegrationSourceType.intercom]: "intercom",
      [IntegrationSourceType.zendesk]: "zendesk",
      [IntegrationSourceType.sentry]: "sentry",
      [IntegrationSourceType.github]: "github",
      13: "anthropic_api",
    };
    for (const r of rows) {
      const name = sourceMap[r.sourceType];
      if (name) savedIntegrations[name] = true;
    }
  }

  // Load saved recipients
  let savedRecipient: { email: string; name: string | null } | null = null;
  if (projectId) {
    const [r] = await db
      .select({ email: emailRecipients.email, name: emailRecipients.name })
      .from(emailRecipients)
      .where(eq(emailRecipients.projectId, projectId))
      .limit(1);
    savedRecipient = r ?? null;
  }

  return (
    <PageShell width="medium">
      <PageHeader
        title="Welcome to Customer Pulse"
        description={
          <>
            Step {stepIndex + 1} of {ONBOARDING_STEPS.length}:{" "}
            <span className="fw-medium text-body">{humanOnboardingStepTitle(step)}</span>
          </>
        }
      />

      <ol className="d-flex flex-wrap gap-2 list-unstyled mb-0 small text-body-secondary">
        {ONBOARDING_STEPS.map((s, i) => (
          <li key={s}>
            <span
              className={
                i === stepIndex
                  ? "badge rounded-pill text-bg-primary"
                  : "badge rounded-pill text-bg-secondary bg-opacity-25"
              }
            >
              {humanOnboardingStepTitle(s)}
            </span>
          </li>
        ))}
      </ol>

      {errMsg ? (
        <InlineAlert variant="danger" className="mt-3">
          {errMsg}
        </InlineAlert>
      ) : null}

      <NarrowCardForm key={step} className="mt-4" bodyClassName="">
        <StepBody step={step} savedProject={savedProject} savedIntegrations={savedIntegrations} savedRecipient={savedRecipient} />
      </NarrowCardForm>

      <p className="mt-4 text-center small text-body-secondary mb-0">
        Need to leave? Use <span className="fw-medium text-body">Sign out</span> at the bottom of the sidebar. You can sign
        back in anytime; this setup will resume until you finish.
      </p>
    </PageShell>
  );
}

interface StepBodyProps {
  step: string;
  savedProject: { name: string } | null;
  savedIntegrations: Record<string, boolean>;
  savedRecipient: { email: string; name: string | null } | null;
}

function StepBody({ step, savedProject, savedIntegrations, savedRecipient }: StepBodyProps) {
  switch (step) {
    case "welcome":
      return (
        <form action={onboardingDispatchAction} className="d-flex flex-column gap-3">
          <input type="hidden" name="_onboarding_step" value="welcome" />
          <p className="text-body-secondary mb-0">
            We&apos;ll walk through creating a project, optionally inviting a teammate, turning on AI classification,
            connecting integrations, and adding digest email recipients. You can skip any optional step and finish later under
            Integrations or Email recipients.
          </p>
          <FormActions variant="plain">
            <button type="submit" className="btn btn-primary">
              Get started
            </button>
          </FormActions>
        </form>
      );

    case "project":
      return (
        <form className="d-flex flex-column gap-3">
          <ProjectStepClient
            savedName={savedProject?.name ?? ""}
            formActions={
              <FormActions>
                <button type="submit" formAction={onboardingGoBackAction} className="btn btn-outline-secondary">
                  Back
                </button>
                <button type="submit" formAction={onboardingDispatchAction} className="btn btn-primary">
                  Continue
                </button>
              </FormActions>
            }
          />
        </form>
      );

    case "team":
      return (
        <form className="d-flex flex-column gap-3">
          <input type="hidden" name="_onboarding_step" value="team" />
          <p className="small text-body-secondary mb-0">
            Invite a teammate by email. If they don&apos;t have an account yet, they&apos;ll be added when they sign up.
          </p>
          <div>
            <label htmlFor="onb-member-email" className="form-label">
              Email
            </label>
            <input id="onb-member-email" name="member_email" type="email" className="form-control" />
          </div>
          <FormActions>
            <button type="submit" formAction={onboardingGoBackAction} className="btn btn-outline-secondary">
              Back
            </button>
            <button type="submit" formAction={onboardingDispatchAction} className="btn btn-primary">
              Add &amp; continue
            </button>
            <button type="submit" formAction={onboardingSkipAction} className="btn btn-outline-secondary">
              Skip
            </button>
          </FormActions>
        </form>
      );

    case "anthropic_api":
      return (
        <form className="d-flex flex-column gap-3">
          {savedIntegrations["anthropic_api"] ? (
            <div className="alert alert-success py-2 small mb-0">
              Anthropic API key is already configured. You can update it below or continue.
            </div>
          ) : null}
          <AnthropicStepClient
            formActions={
              <FormActions>
                <button type="submit" formAction={onboardingGoBackAction} className="btn btn-outline-secondary">
                  Back
                </button>
                <button type="submit" formAction={onboardingDispatchAction} className="btn btn-primary">
                  Save &amp; continue
                </button>
                <button type="submit" formAction={onboardingSkipAction} className="btn btn-outline-secondary">
                  Skip
                </button>
              </FormActions>
            }
          />
        </form>
      );

    case "linear":
    case "slack":
    case "jira":
    case "google_forms":
    case "gong":
    case "logrocket":
    case "fullstory":
    case "intercom":
    case "zendesk":
    case "sentry":
      return <IntegrationStep step={step} configured={!!savedIntegrations[step]} />;

    case "github":
      return (
        <form className="d-flex flex-column gap-3">
          {savedIntegrations["github"] ? (
            <div className="alert alert-success py-2 small mb-0">
              GitHub is already configured. You can update credentials below or continue.
            </div>
          ) : null}
          <GitHubStepClient
            formActions={
              <FormActions>
                <button type="submit" formAction={onboardingGoBackAction} className="btn btn-outline-secondary">
                  Back
                </button>
                <button type="submit" formAction={onboardingDispatchAction} className="btn btn-primary">
                  Save &amp; continue
                </button>
                <button type="submit" formAction={onboardingSkipAction} className="btn btn-outline-secondary">
                  Skip
                </button>
              </FormActions>
            }
          />
        </form>
      );

    case "recipients":
      return (
        <form className="d-flex flex-column gap-3">
          <RecipientsStepClient
            savedEmail={savedRecipient?.email ?? ""}
            savedName={savedRecipient?.name ?? ""}
            formActions={
              <FormActions>
                <button type="submit" formAction={onboardingGoBackAction} className="btn btn-outline-secondary">
                  Back
                </button>
                <button type="submit" formAction={onboardingDispatchAction} className="btn btn-primary">
                  Save &amp; continue
                </button>
                <button type="submit" formAction={onboardingSkipAction} className="btn btn-outline-secondary">
                  Skip
                </button>
              </FormActions>
            }
          />
        </form>
      );

    case "complete":
      return (
        <form className="d-flex flex-column gap-3">
          <input type="hidden" name="_onboarding_step" value="complete" />
          <p className="text-body-secondary mb-0">You are ready to use Customer Pulse.</p>
          <FormActions>
            <button type="submit" formAction={onboardingGoBackAction} className="btn btn-outline-secondary">
              Back
            </button>
            <button type="submit" formAction={onboardingDispatchAction} className="btn btn-success">
              Finish
            </button>
          </FormActions>
        </form>
      );

    default:
      return <p className="text-body-secondary mb-0">Unknown step — contact support.</p>;
  }
}

function IntegrationStep({ step, configured }: { step: string; configured?: boolean }) {
  const example =
    step === "linear"
      ? '{"api_key":"lin_api_..."}'
      : step === "slack"
        ? '{"bot_token":"xoxb-...","channels":["general"],"keywords":["feedback"]}'
        : step === "jira"
          ? '{"site_url":"https://your.atlassian.net","email":"you@co.com","api_token":"..."}'
          : step === "gong"
            ? '{"access_key":"...","access_key_secret":"..."}'
            : step === "github"
              ? '{"access_token":"ghp_...","owner":"org","repo":"app","default_branch":"main"}'
              : '{"api_key":"..."}';

  return (
    <form className="d-flex flex-column gap-3">
      {configured ? (
        <div className="alert alert-success py-2 small mb-0">
          This integration is already configured. You can update credentials below or continue.
        </div>
      ) : null}
      <IntegrationStepClient
        step={step}
        example={example}
        formActions={
          <FormActions>
            <button type="submit" formAction={onboardingGoBackAction} className="btn btn-outline-secondary">
              Back
            </button>
            <button type="submit" formAction={onboardingDispatchAction} className="btn btn-primary">
              Save &amp; continue
            </button>
            <button type="submit" formAction={onboardingSkipAction} className="btn btn-outline-secondary">
              Skip
            </button>
          </FormActions>
        }
      />
    </form>
  );
}
