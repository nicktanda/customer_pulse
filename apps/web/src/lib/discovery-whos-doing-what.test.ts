import { describe, expect, it } from "vitest";
import {
  buildWhosDoingWhatGroups,
  whosDoingWhatBoardFilterHref,
} from "./discovery-whos-doing-what";
import type { DiscoveryBoardActivityRow } from "@customer-pulse/db/queries/discovery";

const base = (overrides: Partial<DiscoveryBoardActivityRow>): DiscoveryBoardActivityRow => ({
  id: 1,
  title: "T",
  activityType: 1,
  status: 2,
  insightId: 1,
  insightTitle: "Insight",
  aiGenerated: false,
  updatedAt: new Date("2026-01-01T12:00:00Z"),
  assigneeId: null,
  insightDiscoveryLeadId: null,
  ownerDisplayLabel: "Unassigned",
  insightDiscoveryStage: 1,
  ...overrides,
});

describe("buildWhosDoingWhatGroups", () => {
  it("buckets by assignee first, then lead", () => {
    const rows: DiscoveryBoardActivityRow[] = [
      base({ id: 1, title: "A1", assigneeId: 10, ownerDisplayLabel: "Ann", updatedAt: new Date("2026-01-02") }),
      base({ id: 2, title: "A2", assigneeId: 10, ownerDisplayLabel: "Ann", updatedAt: new Date("2026-01-01") }),
      base({
        id: 3,
        title: "B1",
        assigneeId: null,
        insightDiscoveryLeadId: 20,
        ownerDisplayLabel: "Bob",
        updatedAt: new Date("2026-01-03"),
      }),
    ];
    const g = buildWhosDoingWhatGroups(rows, { perPersonMax: 2 });
    expect(g).toHaveLength(2);
    expect(g.find((x) => x.userId === 10)?.totalForPerson).toBe(2);
    expect(g.find((x) => x.userId === 20)?.activities[0]?.title).toBe("B1");
  });

  it("puts unassigned last", () => {
    const g = buildWhosDoingWhatGroups(
      [
        base({ id: 1, ownerDisplayLabel: "Unassigned" }),
        base({ id: 2, assigneeId: 5, ownerDisplayLabel: "Solo" }),
      ],
      { perPersonMax: 4 },
    );
    expect(g[0]!.userId).toBe(5);
    expect(g[1]!.userId).toBeNull();
  });

  it("counts more when over cap", () => {
    const rows: DiscoveryBoardActivityRow[] = Array.from({ length: 5 }, (_, i) =>
      base({ id: i, title: `x${i}`, assigneeId: 1, ownerDisplayLabel: "One", updatedAt: new Date(2026, 0, i + 1) }),
    );
    const g = buildWhosDoingWhatGroups(rows, { perPersonMax: 2 });
    expect(g[0]!.activities).toHaveLength(2);
    expect(g[0]!.moreCount).toBe(3);
    expect(g[0]!.totalForPerson).toBe(5);
  });
});

describe("whosDoingWhatBoardFilterHref", () => {
  it("maps unassigned and user", () => {
    expect(whosDoingWhatBoardFilterHref(null)).toBe("/app/discover/board?owner=unassigned");
    expect(whosDoingWhatBoardFilterHref(7)).toBe("/app/discover/board?owner=7");
  });
});
