import { describe, it, expect } from "vitest";
import {
  relativeLuminance,
  contrastRatio,
  passesWCAG_AA,
  isValidHex,
} from "../AccentColorPicker";

describe("relativeLuminance", () => {
  it("returns 0 for black", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0);
  });

  it("returns ~1 for white", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1);
  });

  it("returns a value between 0 and 1 for mid colours", () => {
    const l = relativeLuminance("#4F46E5");
    expect(l).toBeGreaterThan(0);
    expect(l).toBeLessThan(1);
  });
});

describe("contrastRatio", () => {
  it("returns 21 for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21);
  });

  it("returns 1 for identical colours", () => {
    expect(contrastRatio("#4F46E5", "#4F46E5")).toBeCloseTo(1);
  });

  it("is commutative", () => {
    const a = contrastRatio("#4F46E5", "#ffffff");
    const b = contrastRatio("#ffffff", "#4F46E5");
    expect(a).toBeCloseTo(b);
  });
});

describe("passesWCAG_AA", () => {
  it("passes for dark indigo against white", () => {
    // #4F46E5 has sufficient contrast
    expect(passesWCAG_AA("#4F46E5")).toBe(true);
  });

  it("fails for a very light colour against white", () => {
    expect(passesWCAG_AA("#eeeeee")).toBe(false);
  });
});

describe("isValidHex", () => {
  it("accepts a valid 6-digit hex", () => {
    expect(isValidHex("#4F46E5")).toBe(true);
  });

  it("rejects a 3-digit hex shorthand", () => {
    expect(isValidHex("#fff")).toBe(false);
  });

  it("rejects a value without hash", () => {
    expect(isValidHex("4F46E5")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidHex("")).toBe(false);
  });
});
