import { describe, expect, it } from "vitest";
import { parseReportStructured, reportStructuredSchema } from "./reporting-structured";

describe("reportStructuredSchema", () => {
  it("accepts a minimal valid payload", () => {
    const raw = {
      narrative: "Hello",
      charts: [
        {
          type: "bar" as const,
          labels: ["A", "B"],
          series: [{ name: "n", data: [1, 2] }],
        },
      ],
    };
    expect(reportStructuredSchema.safeParse(raw).success).toBe(true);
  });

  it("rejects mismatched series length", () => {
    const raw = {
      narrative: "x",
      charts: [{ type: "line", labels: ["A", "B"], series: [{ name: "n", data: [1] }] }],
    };
    expect(reportStructuredSchema.safeParse(raw).success).toBe(false);
  });
});

describe("parseReportStructured", () => {
  it("returns null for garbage", () => {
    expect(parseReportStructured(null)).toBeNull();
    expect(parseReportStructured({})).toBeNull();
  });

  it("parses valid objects", () => {
    const v = parseReportStructured({
      narrative: "ok",
      charts: [],
    });
    expect(v?.narrative).toBe("ok");
    expect(v?.charts).toEqual([]);
  });
});
