/**
 * Maps integer columns on `insights` rows to labels for tables and badges.
 *
 * Integer keys must stay aligned with `packages/db/src/enums.ts` and PARITY_MATRIX.
 * This module does **not** import `@customer-pulse/db/client` so it is safe to use from
 * client components (no `postgres` / Node `net` in the browser bundle).
 */
export const INSIGHT_TYPE_LABELS: Record<number, string> = {
  0: "Problem",
  1: "Opportunity",
  2: "Trend",
  3: "Risk",
  4: "User need",
};

export const INSIGHT_SEVERITY_LABELS: Record<number, string> = {
  0: "Informational",
  1: "Minor",
  2: "Moderate",
  3: "Major",
  4: "Critical",
};

export const INSIGHT_STATUS_LABELS: Record<number, string> = {
  0: "Discovered",
  1: "Validated",
  2: "In progress",
  3: "Addressed",
  4: "Dismissed",
};

export function insightTypeLabel(value: number): string {
  return INSIGHT_TYPE_LABELS[value] ?? `Type ${value}`;
}

export function insightSeverityLabel(value: number): string {
  return INSIGHT_SEVERITY_LABELS[value] ?? `Severity ${value}`;
}

export function insightStatusLabel(value: number): string {
  return INSIGHT_STATUS_LABELS[value] ?? `Status ${value}`;
}
