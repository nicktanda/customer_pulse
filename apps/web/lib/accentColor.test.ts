/**
 * Unit tests for accent colour utilities.
 * Run with: npx jest apps/web/lib/accentColor.test.ts
 */

import {
  contrastRatio,
  isValidHexColor,
  passesWcagAA,
} from "./accentColor";

describe("isValidHexColor", () => {
  it("accepts valid 6-digit hex", () => {
    expect(isValidHexColor("#6366f1")).toBe(true);
    expect(isValidHexColor("#000000")).toBe(true);
    expect(isValidHexColor("#FFFFFF")).toBe(true);
  });

  it("accepts valid 3-digit hex", () => {
    expect(isValidHexColor("#fff")).toBe(true);
    expect(isValidHexColor("#000")).toBe(true);
    expect(isValidHexColor("#abc")).toBe(true);
  });

  it("rejects strings without leading #", () => {
    expect(isValidHexColor("6366f1")).toBe(false);
  });

  it("rejects strings with wrong length", () => {
    expect(isValidHexColor("#12345")).toBe(false);
    expect(isValidHexColor("#1234567")).toBe(false);
  });

  it("rejects non-hex characters", () => {
    expect(isValidHexColor("#zzzzzz")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidHexColor("")).toBe(false);
  });
});

describe("contrastRatio", () => {
  it("returns 21 for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("returns 1 for identical colours", () => {
    expect(contrastRatio("#6366f1", "#6366f1")).toBeCloseTo(1, 1);
  });

  it("is symmetric", () => {
    const a = contrastRatio("#6366f1", "#ffffff");
    const b = contrastRatio("#ffffff", "#6366f1");
    expect(a).toBeCloseTo(b, 5);
  });

  it("returns 1 for invalid hex", () => {
    expect(contrastRatio("not-a-colour", "#fff")).toBe(1);
  });
});

describe("passesWcagAA", () => {
  it("returns true for dark colours with high contrast against white", () => {
    expect(passesWcagAA("#1d4ed8")).toBe(true); // Blue-700
    expect(passesWcagAA("#7c3aed")).toBe(true); // Violet-600
  });

  it("returns false for light yellow which has low contrast against white", () => {
    expect(passesWcagAA("#fde68a")).toBe(false); // Amber-200
  });

  it("returns false for white on white", () => {
    expect(passesWcagAA("#ffffff")).toBe(false);
  });
});
