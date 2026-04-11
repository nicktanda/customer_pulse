import { describe, expect, it } from "vitest";
import { slugifyName } from "./slug";

describe("slugifyName", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugifyName("Acme Corp")).toBe("acme-corp");
  });

  it("strips invalid characters", () => {
    expect(slugifyName("Team #1 (EU)!!!")).toBe("team-1-eu");
  });

  it("falls back when empty after stripping", () => {
    expect(slugifyName("!!!")).toBe("project");
  });
});
