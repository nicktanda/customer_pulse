/**
 * UI labels for `integrations.source_type` (integers match `IntegrationSourceType` in packages/db).
 * Kept free of `@customer-pulse/db/client` imports so client components can use labels without bundling the DB driver.
 */
export const INTEGRATION_SOURCE_LABELS: Record<number, string> = {
  0: "Linear",
  1: "Google Forms",
  2: "Slack",
  3: "Custom API",
  4: "Gong",
  5: "Excel Online",
  6: "Jira",
  7: "LogRocket",
  8: "FullStory",
  9: "Intercom",
  10: "Zendesk",
  11: "Sentry",
  12: "GitHub",
};

export const INTEGRATION_SOURCE_OPTIONS = Object.entries(INTEGRATION_SOURCE_LABELS).map(([value, label]) => ({
  value: Number(value),
  label,
}));
