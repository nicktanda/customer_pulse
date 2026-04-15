import { FeedbackPriority } from "@customer-pulse/db/client";

const PRIORITY_MAPPING: Record<string, keyof typeof FeedbackPriority> = {
  Highest: "p1",
  High: "p2",
  Medium: "p3",
  Low: "p4",
  Lowest: "p4",
};

/** Jira Cloud priority name → same enum ints as the legacy Jira client mapping (keep DB stable). */
export function jiraPriorityNameToEnum(name: unknown): number {
  if (typeof name !== "string") {
    return FeedbackPriority.unset;
  }
  const key = PRIORITY_MAPPING[name];
  return key ? FeedbackPriority[key] : FeedbackPriority.unset;
}
