import { describe, expect, it } from "vitest";
import { reportStructuredSchema, stripJsonFence } from "./reporting-structured";

/**
 * Worker validates model JSON before persisting. These tests mirror the web app’s
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

describe("reportStructuredSchema (worker)", () => {
  it("accepts empty charts", () => {
    const r = reportStructuredSchema.safeParse({ narrative: "Summary", charts: [] });
    expect(r.success).toBe(true);
  });
});
