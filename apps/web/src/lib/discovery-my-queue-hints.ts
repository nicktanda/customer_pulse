/**
 * Rule-based “completeness” hints for the “My discovery” queue (Stage 2).
 * No ML — integers match DiscoveryActivityType / DiscoveryActivityStatus in `packages/db` enums.
 *
 * Desk research (type 6) has no AI draft in the product — we never show “no AI draft” for it.
 */
export type MyQueueHintInput = {
  status: number;
  activityType: number;
  aiGenerated: boolean;
  findings: string | null;
};

export function myDiscoveryActivityHints(input: MyQueueHintInput): string[] {
  const hints: string[] = [];
  const noFindings = !input.findings?.trim();
  const isDeskResearch = input.activityType === 6;
  const isDraftish = input.status === 1 || input.status === 2;

  if (isDraftish) {
    if (!isDeskResearch && !input.aiGenerated) {
      hints.push("No AI draft yet");
    }
    if (noFindings) {
      hints.push("No findings yet");
    }
  }

  if (input.status === 3 && noFindings) {
    hints.push("Marked complete without written findings");
  }

  return hints;
}
