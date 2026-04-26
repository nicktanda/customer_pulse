import { describe, expect, it } from "vitest";
import {
  groupBoardActivitiesByStatus,
  isAllowedDiscoveryBoardStatus,
  parseBoardColumnParam,
  parseBoardInsightParam,
  parseBoardOwnerParam,
  toBoardSearchParams,
} from "./discovery-board";
import type { DiscoveryBoardActivityRow } from "@customer-pulse/db/queries/discovery";

function row(partial: Partial<DiscoveryBoardActivityRow> & Pick<DiscoveryBoardActivityRow, "id" | "status">): DiscoveryBoardActivityRow {
  return {
    title: "t",
    activityType: 1,
    insightId: 1,
    insightTitle: "Insight",
    aiGenerated: false,
    updatedAt: new Date(),
    assigneeId: null,
    insightDiscoveryLeadId: null,
    insightDiscoveryStage: 1,
    ownerDisplayLabel: "Unassigned",
    ...partial,
  };
}

describe("isAllowedDiscoveryBoardStatus", () => {
  it("accepts 1–4 only", () => {
    expect(isAllowedDiscoveryBoardStatus(1)).toBe(true);
    expect(isAllowedDiscoveryBoardStatus(4)).toBe(true);
    expect(isAllowedDiscoveryBoardStatus(0)).toBe(false);
    expect(isAllowedDiscoveryBoardStatus(5)).toBe(false);
  });
});

describe("groupBoardActivitiesByStatus", () => {
  it("places each row under the correct status column", () => {
    const grouped = groupBoardActivitiesByStatus([
      row({ id: 1, status: 1 }),
      row({ id: 2, status: 2 }),
      row({ id: 3, status: 3 }),
      row({ id: 4, status: 4 }),
    ]);
    expect(grouped[1].map((r) => r.id)).toEqual([1]);
    expect(grouped[2].map((r) => r.id)).toEqual([2]);
    expect(grouped[3].map((r) => r.id)).toEqual([3]);
    expect(grouped[4].map((r) => r.id)).toEqual([4]);
  });

  it("buckets unknown statuses into draft", () => {
    const grouped = groupBoardActivitiesByStatus([row({ id: 9, status: 99 })]);
    expect(grouped[1].map((r) => r.id)).toEqual([9]);
    expect(grouped[2]).toHaveLength(0);
  });
});

describe("parseBoardInsightParam", () => {
  it("returns undefined for missing or invalid", () => {
    expect(parseBoardInsightParam(undefined)).toBeUndefined();
    expect(parseBoardInsightParam("")).toBeUndefined();
    expect(parseBoardInsightParam("abc")).toBeUndefined();
    expect(parseBoardInsightParam("0")).toBeUndefined();
  });

  it("returns a positive integer for valid strings", () => {
    expect(parseBoardInsightParam("42")).toBe(42);
  });
});

describe("parseBoardOwnerParam", () => {
  it("treats missing or invalid as all", () => {
    expect(parseBoardOwnerParam(undefined)).toEqual({ kind: "all" });
    expect(parseBoardOwnerParam("")).toEqual({ kind: "all" });
    expect(parseBoardOwnerParam("  ")).toEqual({ kind: "all" });
    expect(parseBoardOwnerParam("0")).toEqual({ kind: "all" });
    expect(parseBoardOwnerParam("abc")).toEqual({ kind: "all" });
  });

  it("parses unassigned", () => {
    expect(parseBoardOwnerParam("unassigned")).toEqual({ kind: "unassigned" });
  });

  it("parses positive user id", () => {
    expect(parseBoardOwnerParam("7")).toEqual({ kind: "user", userId: 7 });
  });
});

describe("parseBoardColumnParam", () => {
  it("treats missing or invalid as all", () => {
    expect(parseBoardColumnParam(undefined)).toEqual({ kind: "all" });
    expect(parseBoardColumnParam("")).toEqual({ kind: "all" });
    expect(parseBoardColumnParam("0")).toEqual({ kind: "all" });
    expect(parseBoardColumnParam("5")).toEqual({ kind: "all" });
    expect(parseBoardColumnParam("x")).toEqual({ kind: "all" });
  });

  it("parses 1–4 to match Kanban activity status columns", () => {
    expect(parseBoardColumnParam("1")).toEqual({ kind: "column", column: 1 });
    expect(parseBoardColumnParam("4")).toEqual({ kind: "column", column: 4 });
  });
});

describe("toBoardSearchParams", () => {
  it("round-trips a combined filter for links", () => {
    expect(
      toBoardSearchParams({
        insightId: 9,
        owner: { kind: "unassigned" },
        column: { kind: "column", column: 3 },
      }),
    ).toBe("?insight=9&owner=unassigned&column=3");
  });

  it("omits empty parts", () => {
    expect(toBoardSearchParams({ owner: { kind: "all" }, column: { kind: "all" } })).toBe("");
  });
});
