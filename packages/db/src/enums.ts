/** Integer enums — numeric values must stay aligned with PARITY_MATRIX / existing DB rows. */

export const FeedbackSource = {
  linear: 0,
  google_forms: 1,
  slack: 2,
  custom: 3,
  gong: 4,
  excel_online: 5,
  jira: 6,
  logrocket: 7,
  fullstory: 8,
  intercom: 9,
  zendesk: 10,
  sentry: 11,
} as const;

export const FeedbackCategory = {
  uncategorized: 0,
  bug: 1,
  feature_request: 2,
  complaint: 3,
} as const;

export const FeedbackPriority = {
  unset: 0,
  p1: 1,
  p2: 2,
  p3: 3,
  p4: 4,
} as const;

export const FeedbackStatus = {
  new_feedback: 0,
  triaged: 1,
  in_progress: 2,
  resolved: 3,
  archived: 4,
} as const;

/** integrations.source_type (includes github; feedback.source does not). */
export const IntegrationSourceType = {
  linear: 0,
  google_forms: 1,
  slack: 2,
  custom: 3,
  gong: 4,
  excel_online: 5,
  jira: 6,
  logrocket: 7,
  fullstory: 8,
  intercom: 9,
  zendesk: 10,
  sentry: 11,
  github: 12,
} as const;

export const UserRole = {
  viewer: 0,
  admin: 1,
} as const;

/** reporting_requests.output_mode */
export const ReportingOutputMode = {
  answer: 0,
  report_chart: 1,
} as const;

/** reporting_requests.status */
export const ReportingRequestStatus = {
  pending: 0,
  running: 1,
  done: 2,
  failed: 3,
} as const;

/** insights.insight_type — see docs/next-migration/PARITY_MATRIX.md */
export const InsightType = {
  problem: 0,
  opportunity: 1,
  trend: 2,
  risk: 3,
  user_need: 4,
} as const;

/** insights.severity */
export const InsightSeverity = {
  informational: 0,
  minor: 1,
  moderate: 2,
  major: 3,
  critical: 4,
} as const;

/** insights.status */
export const InsightStatus = {
  discovered: 0,
  validated: 1,
  in_progress: 2,
  addressed: 3,
  dismissed: 4,
} as const;

/**
 * specs.status — tracks a spec through the Build pipeline.
 * Integer values must stay stable once rows exist in production.
 *
 * backlog    (0) — idea logged, not yet being written
 * drafting   (1) — someone is actively writing the spec
 * review     (2) — spec is ready for PM/stakeholder review
 * ready      (3) — reviewed and approved, waiting for dev
 * in_progress(4) — development has started
 * shipped    (5) — feature is live; triggers Monitor area
 */
export const SpecStatus = {
  backlog: 0,
  drafting: 1,
  review: 2,
  ready: 3,
  in_progress: 4,
  shipped: 5,
} as const;
