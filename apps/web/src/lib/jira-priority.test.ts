import { describe, expect, it } from "vitest";
import { FeedbackPriority } from "@customer-pulse/db/client";
import { jiraPriorityNameToEnum } from "./jira-priority";

/** Jira sends human-readable priority names; we map them to our DB enum ints. */
describe("jiraPriorityNameToEnum", () => {
  it("maps Jira Cloud names to priorities", () => {
    expect(jiraPriorityNameToEnum("Highest")).toBe(FeedbackPriority.p1);
    expect(jiraPriorityNameToEnum("High")).toBe(FeedbackPriority.p2);
    expect(jiraPriorityNameToEnum("Medium")).toBe(FeedbackPriority.p3);
    expect(jiraPriorityNameToEnum("Low")).toBe(FeedbackPriority.p4);
  });

  it("returns unset for unknown or non-strings", () => {
    expect(jiraPriorityNameToEnum("Unknown")).toBe(FeedbackPriority.unset);
    expect(jiraPriorityNameToEnum(null)).toBe(FeedbackPriority.unset);
    expect(jiraPriorityNameToEnum(1)).toBe(FeedbackPriority.unset);
  });
});
