import { describe, expect, it } from "vitest";
import { myDiscoveryActivityHints } from "./discovery-my-queue-hints";

describe("myDiscoveryActivityHints", () => {
  it("suggests draft + findings for in-progress non-desk with no content", () => {
    expect(
      myDiscoveryActivityHints({
        status: 2,
        activityType: 1,
        aiGenerated: false,
        findings: null,
      }),
    ).toEqual(["No AI draft yet", "No findings yet"]);
  });

  it("omits no-AI line for desk research", () => {
    expect(
      myDiscoveryActivityHints({
        status: 1,
        activityType: 6,
        aiGenerated: false,
        findings: "  ",
      }),
    ).toEqual(["No findings yet"]);
  });

  it("nags when complete but empty findings", () => {
    expect(
      myDiscoveryActivityHints({
        status: 3,
        activityType: 3,
        aiGenerated: true,
        findings: null,
      }),
    ).toEqual(["Marked complete without written findings"]);
  });

  it("returns nothing when complete with findings", () => {
    expect(
      myDiscoveryActivityHints({
        status: 3,
        activityType: 1,
        aiGenerated: true,
        findings: "Done.",
      }),
    ).toEqual([]);
  });
});
