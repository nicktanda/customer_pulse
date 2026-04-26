import { describe, expect, it } from "vitest";
import { CHART_TYPES, reportChartSchema, reportStructuredSchema, stripJsonFence } from "./reporting-structured";

/**
 * Worker validates model JSON before persisting. These tests mirror the web app's
 * reporting shape so drift between packages is caught early.
 */
describe("stripJsonFence", () => {
  it("returns plain JSON unchanged", () => {
    expect(stripJsonFence(`{"a":1}`)).toBe(`{"a":1}`);
  });

  it("removes markdown ```json fences", () => {
    const inner = `{"narrative":"x","charts":[]}`;
    const wrapped = "```json\n" + inner + "\n```";
    expect(stripJsonFence(wrapped)).toBe(inner);
  });
});

describe("CHART_TYPES", () => {
  it("includes all new chart types", () => {
    expect(CHART_TYPES).toContain("bar");
    expect(CHART_TYPES).toContain("bar_stacked");
    expect(CHART_TYPES).toContain("bar_horizontal");
    expect(CHART_TYPES).toContain("line");
    expect(CHART_TYPES).toContain("area");
    expect(CHART_TYPES).toContain("pie");
    expect(CHART_TYPES).toContain("scatter");
  });
});

describe("reportChartSchema", () => {
  const validBase = {
    labels: ["Jan", "Feb", "Mar"],
    series: [{ name: "Count", data: [10, 20, 30] }],
  };

  it.each(["bar", "bar_stacked", "bar_horizontal", "line", "area", "pie", "scatter"] as const)(
    "accepts type=%s",
    (type) => {
      // scatter with two series
      const input =
        type === "scatter"
          ? { ...validBase, type, series: [{ name: "X", data: [1, 2, 3] }, { name: "Y", data: [4, 5, 6] }] }
          : { ...validBase, type };
      expect(reportChartSchema.safeParse(input).success).toBe(true);
    },
  );

  it("rejects unknown type", () => {
    expect(reportChartSchema.safeParse({ ...validBase, type: "donut" }).success).toBe(false);
  });

  it("rejects mismatched series data length", () => {
    const result = reportChartSchema.safeParse({
      type: "bar",
      labels: ["A", "B"],
      series: [{ name: "X", data: [1] }], // length 1, labels length 2
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional title", () => {
    expect(reportChartSchema.safeParse({ ...validBase, type: "bar", title: "My chart" }).success).toBe(true);
  });

  it("accepts pie chart with one series", () => {
    const pie = {
      type: "pie",
      labels: ["Bug", "Feature", "Question"],
      series: [{ name: "Count", data: [40, 35, 25] }],
    };
    expect(reportChartSchema.safeParse(pie).success).toBe(true);
  });
});

describe("reportStructuredSchema (worker)", () => {
  it("accepts empty charts", () => {
    const r = reportStructuredSchema.safeParse({ narrative: "Summary", charts: [] });
    expect(r.success).toBe(true);
  });

  it("accepts multiple chart types in one response", () => {
    const r = reportStructuredSchema.safeParse({
      narrative: "Here are two views of your data.",
      charts: [
        {
          type: "line",
          labels: ["2024-01-01", "2024-01-02"],
          series: [{ name: "Volume", data: [5, 8] }],
        },
        {
          type: "pie",
          labels: ["Bug", "Feature"],
          series: [{ name: "Count", data: [60, 40] }],
        },
      ],
    });
    expect(r.success).toBe(true);
  });
});
