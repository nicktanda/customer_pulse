import {
  contrastRatio,
  isAccessible,
  isValidHex,
  CURATED_PALETTE,
  DEFAULT_ACCENT,
} from "./accentColor";

describe("isValidHex", () => {
  it("accepts 6-char hex with hash", () => {
    expect(isValidHex("#6366f1")).toBe(true);
  });
  it("accepts 3-char shorthand", () => {
    expect(isValidHex("#fff")).toBe(true);
  });
  it("rejects missing hash", () => {
    expect(isValidHex("6366f1")).toBe(false);
  });
  it("rejects invalid chars", () => {
    expect(isValidHex("#gggggg")).toBe(false);
  });
  it("rejects empty string", () => {
    expect(isValidHex("")).toBe(false);
  });
});

describe("contrastRatio", () => {
  it("returns ~21 for black on white", () => {
    const ratio = contrastRatio("#000000", "#ffffff");
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeCloseTo(21, 0);
  });
  it("returns 1 for same colours", () => {
    const ratio = contrastRatio("#ffffff", "#ffffff");
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeCloseTo(1, 0);
  });
  it("returns null for invalid hex", () => {
    expect(contrastRatio("notahex", "#ffffff")).toBeNull();
  });
});

describe("isAccessible", () => {
  it("returns false for white on white", () => {
    expect(isAccessible("#ffffff")).toBe(false);
  });
  it("returns true for black on white", () => {
    expect(isAccessible("#000000")).toBe(true);
  });
});

describe("CURATED_PALETTE", () => {
  it("has at least 8 swatches", () => {
    expect(CURATED_PALETTE.length).toBeGreaterThanOrEqual(8);
  });
  it("every swatch value is a valid hex", () => {
    CURATED_PALETTE.forEach((s) => {
      expect(isValidHex(s.value)).toBe(true);
    });
  });
});

describe("DEFAULT_ACCENT", () => {
  it("is a valid hex string", () => {
    expect(isValidHex(DEFAULT_ACCENT)).toBe(true);
  });
});
