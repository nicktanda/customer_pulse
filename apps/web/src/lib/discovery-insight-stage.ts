/**
 * User-facing labels for `insights.discovery_stage` (Stage 4).
 * Integers must match `DiscoveryInsightStage` in `packages/db/src/enums.ts`.
 */
export const DISCOVERY_INSIGHT_STAGE_ORDER = [1, 2, 3, 4, 5] as const;

export type DiscoveryInsightStageId = (typeof DISCOVERY_INSIGHT_STAGE_ORDER)[number];

export function isValidDiscoveryInsightStage(n: number): n is DiscoveryInsightStageId {
  return n === 1 || n === 2 || n === 3 || n === 4 || n === 5;
}

/**
 * Long label for badges and select options (e.g. on the insight discovery page).
 */
export function discoveryInsightStageLabel(stage: number): string {
  switch (stage) {
    case 1:
      return "Framing";
    case 2:
      return "Recruiting";
    case 3:
      return "Running research";
    case 4:
      return "Synthesis";
    case 5:
      return "Decision";
    default:
      return "Unknown stage";
  }
}

/**
 * Shorter line for tight spaces (board cards, “My discovery”).
 */
export function discoveryInsightStageShortLabel(stage: number): string {
  switch (stage) {
    case 1:
      return "Framing";
    case 2:
      return "Recruiting";
    case 3:
      return "Research";
    case 4:
      return "Synthesis";
    case 5:
      return "Decision";
    default:
      return "—";
  }
}

/**
 * Subtle badge styling — distinct from activity **status** colors on the same card.
 * Later you can split by `stage` for stronger visual progression.
 */
export function discoveryInsightStageBadgeClass(stage: number): string {
  // High stages read as "later" in the process (slightly stronger emphasis).
  if (stage >= 5) {
    return "text-bg-success";
  }
  if (stage >= 3) {
    return "text-bg-info";
  }
  return "bg-body-secondary text-body border border-secondary-subtle";
}
