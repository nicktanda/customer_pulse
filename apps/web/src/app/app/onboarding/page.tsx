import { redirect } from "next/navigation";
import { FormActions, InlineAlert, NarrowCardForm, PageHeader, PageShell } from "@/components/ui";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { users } from "@customer-pulse/db/client";
import { ONBOARDING_STEPS, humanOnboardingStepTitle } from "@/lib/onboarding-steps";
import { onboardingDispatchAction, onboardingGoBackAction } from "./actions";

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

      <NarrowCardForm className="mt-4" bodyClassName="">
        <StepBody step={step} />
      </NarrowCardForm>

      <p className="mt-4 text-center small text-body-secondary mb-0">
        Need to leave? Use <span className="fw-medium text-body">Sign out</span> at the bottom of the sidebar. You can sign
        back in anytime; this setup will resume until you finish.
      </p>
    </PageShell>
  );
}

function StepBody({ step }: { step: string }) {
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
          <input type="hidden" name="_onboarding_step" value="project" />
          <div>
            <label htmlFor="onb-project-name" className="form-label">
              Project name
            </label>
            <input
              id="onb-project-name"
              name="project_name"
              required
              className="form-control"
              placeholder="Acme Customer Voice"
            />
          </div>
          <FormActions>
            <button type="submit" formAction={onboardingGoBackAction} className="btn btn-outline-secondary">
              Back
            </button>
            <button type="submit" formAction={onboardingDispatchAction} className="btn btn-primary">
              Continue
            </button>
          </FormActions>
        </form>
      );

    case "team":
      return (
        <form className="d-flex flex-column gap-3">
          <input type="hidden" name="_onboarding_step" value="team" />
          <p className="small text-body-secondary mb-0">
            Invite an existing user by email (they must already have an account).
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
            <button type="submit" formAction={onboardingDispatchAction} name="skip" value="1" className="btn btn-outline-secondary">
              Skip
            </button>
          </FormActions>
        </form>
      );

    case "anthropic_api":
      return (
        <form className="d-flex flex-column gap-3">
          <input type="hidden" name="_onboarding_step" value="anthropic_api" />
          <p className="small text-body-secondary mb-0">
            AI classification needs an Anthropic API key on the server. Your administrator should set{" "}
            <code className="px-1 rounded bg-body-secondary">ANTHROPIC_API_KEY</code> in the app environment (e.g.{" "}
            <code className="px-1 rounded bg-body-secondary">.env</code> when running locally). You can skip for now and
            configure later.
          </p>
          <FormActions>
            <button type="submit" formAction={onboardingGoBackAction} className="btn btn-outline-secondary">
              Back
            </button>
            <button type="submit" formAction={onboardingDispatchAction} className="btn btn-primary">
              Continue
            </button>
            <button type="submit" formAction={onboardingDispatchAction} name="skip" value="1" className="btn btn-outline-secondary">
              Skip
            </button>
          </FormActions>
        </form>
      );

    case "linear":
    case "slack":
    case "jira":
    case "google_forms":
    case "logrocket":
    case "fullstory":
    case "intercom":
    case "zendesk":
    case "sentry":
    case "github":
      return <IntegrationStep step={step} />;

    case "recipients":
      return (
        <form className="d-flex flex-column gap-3">
          <input type="hidden" name="_onboarding_step" value="recipients" />
          <p className="small text-body-secondary mb-0">Optional: add a digest recipient for the current project.</p>
          <div>
            <label htmlFor="onb-recipient-email" className="form-label">
              Email
            </label>
            <input id="onb-recipient-email" name="recipient_email" type="email" className="form-control" />
          </div>
          <div>
            <label htmlFor="onb-recipient-name" className="form-label">
              Name (optional)
            </label>
            <input id="onb-recipient-name" name="recipient_name" className="form-control" />
          </div>
          <FormActions>
            <button type="submit" formAction={onboardingGoBackAction} className="btn btn-outline-secondary">
              Back
            </button>
            <button type="submit" formAction={onboardingDispatchAction} className="btn btn-primary">
              Save &amp; continue
            </button>
            <button type="submit" formAction={onboardingDispatchAction} name="skip" value="1" className="btn btn-outline-secondary">
              Skip
            </button>
          </FormActions>
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

function IntegrationStep({ step }: { step: string }) {
  const example =
    step === "linear"
      ? '{"api_key":"lin_api_..."}'
      : step === "slack"
        ? '{"bot_token":"xoxb-...","channels":["general"],"keywords":["feedback"]}'
        : step === "jira"
          ? '{"site_url":"https://your.atlassian.net","email":"you@co.com","api_token":"..."}'
          : step === "github"
            ? '{"access_token":"ghp_...","owner":"org","repo":"app","default_branch":"main"}'
            : '{"api_key":"..."}';

  return (
    <form className="d-flex flex-column gap-3">
      <input type="hidden" name="_onboarding_step" value={step} />
      <p className="small text-body-secondary mb-0">
        Paste credentials as JSON — they are encrypted at rest. Example:{" "}
        <code className="d-inline-block text-break px-1 rounded bg-body-secondary small">{example}</code>
      </p>
      <div>
        <label htmlFor="onb-creds-json" className="form-label">
          Credentials JSON (optional)
        </label>
        <textarea
          id="onb-creds-json"
          name="credentials_json"
          rows={5}
          className="form-control font-monospace small"
          placeholder={example}
        />
      </div>
      <FormActions>
        <button type="submit" formAction={onboardingGoBackAction} className="btn btn-outline-secondary">
          Back
        </button>
        <button type="submit" formAction={onboardingDispatchAction} className="btn btn-primary">
          Save &amp; continue
        </button>
        <button type="submit" formAction={onboardingDispatchAction} name="skip" value="1" className="btn btn-outline-secondary">
          Skip
        </button>
      </FormActions>
    </form>
  );
}
