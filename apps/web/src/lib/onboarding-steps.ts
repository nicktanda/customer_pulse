/** Wizard step order — keep stable so URLs and progress make sense for users. */
export const ONBOARDING_STEPS = [
  "welcome",
  "project",
  "team",
  "anthropic_api",
  "linear",
  "slack",
  "jira",
  "google_forms",
  "logrocket",
  "fullstory",
  "intercom",
  "zendesk",
  "sentry",
  "github",
  "recipients",
  "complete",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Short titles for progress UI (header + step pills) — not internal step ids. */
const STEP_LABELS: Record<OnboardingStep, string> = {
  welcome: "Welcome",
  project: "Create project",
  team: "Invite teammate",
  anthropic_api: "AI (Anthropic)",
  linear: "Linear",
  slack: "Slack",
  jira: "Jira",
  google_forms: "Google Forms",
  logrocket: "LogRocket",
  fullstory: "FullStory",
  intercom: "Intercom",
  zendesk: "Zendesk",
  sentry: "Sentry",
  github: "GitHub",
  recipients: "Email digest",
  complete: "Finish",
};

export function humanOnboardingStepTitle(step: string): string {
  const key = step as OnboardingStep;
  return ONBOARDING_STEPS.includes(key) ? STEP_LABELS[key] : step.replace(/_/g, " ");
}

export function nextOnboardingStep(current: string): string {
  const i = ONBOARDING_STEPS.indexOf(current as OnboardingStep);
  if (i < 0) {
    return ONBOARDING_STEPS[1] ?? "project";
  }
  return ONBOARDING_STEPS[i + 1] ?? "complete";
}

export function prevOnboardingStep(current: string): string {
  const i = ONBOARDING_STEPS.indexOf(current as OnboardingStep);
  if (i <= 0) {
    return ONBOARDING_STEPS[0]!;
  }
  return ONBOARDING_STEPS[i - 1]!;
}
