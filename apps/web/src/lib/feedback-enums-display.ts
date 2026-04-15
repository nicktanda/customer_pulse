/**
 * Human-readable labels for dropdowns and tables (maps integer enum → string).
 *
 * Integer keys must stay aligned with `packages/db/src/enums.ts` and PARITY_MATRIX — this file
 * intentionally does **not** import `@customer-pulse/db/client` so it can be used from
 * client components without pulling the `postgres` driver into the browser bundle.
 */
export const FEEDBACK_SOURCE_LABELS: Record<number, string> = {
  0: "Linear",
  1: "Google Forms",
  2: "Slack",
  3: "Custom",
  4: "Gong",
  5: "Excel Online",
  6: "Jira",
  7: "LogRocket",
  8: "FullStory",
  9: "Intercom",
  10: "Zendesk",
  11: "Sentry",
};

export const FEEDBACK_CATEGORY_LABELS: Record<number, string> = {
  0: "Uncategorized",
  1: "Bug",
  2: "Feature",
  3: "Complaint",
};

export const FEEDBACK_PRIORITY_LABELS: Record<number, string> = {
  0: "Unset",
  1: "P1",
  2: "P2",
  3: "P3",
  4: "P4",
};

export const FEEDBACK_STATUS_LABELS: Record<number, string> = {
  0: "New",
  1: "Triaged",
  2: "In progress",
  3: "Resolved",
  4: "Archived",
};
