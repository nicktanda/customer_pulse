import {
  hexToRgb,
  contrastRatio,
  meetsWcagAA,
  DEFAULT_ACCENT_COLOR,
  ACCENT_PALETTE,
} from "../accent-color";

describe("hexToRgb", () => {
  it("parses a valid hex colour", () => {
    expect(hexToRgb("#4F46E5")).toEqual({ r: 79, g: 70, b: 229 });
  });

  it("handles lowercase hex", () => {
    expect(hexToRgb("#ffffff")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("returns null for invalid input", () => {
    expect(hexToRgb("not-a-color")).toBeNull();
    expect(hexToRgb("#FFF")).toBeNull(); // 3-digit not supported
    expect(hexToRgb("")).toBeNull();
  });
});

describe("contrastRatio", () => {
  it("returns 21 for black on white", () => {
    const ratio = contrastRatio("#000000", "#FFFFFF");
    expect(ratio).toBeCloseTo(21, 0);
  });

  it("returns 1 for identical colours", () => {
    const ratio = contrastRatio("#4F46E5", "#4F46E5");
    expect(ratio).toBeCloseTo(1, 1);
  });

  it("returns null for invalid hex", () => {
    expect(contrastRatio("bad", "#FFFFFF")).toBeNull();
  });
});

describe("meetsWcagAA", () => {
  it("returns true for black (high contrast)", () => {
    expect(meetsWcagAA("#000000")).toBe(true);
  });

  it("returns false for white on white", () => {
    expect(meetsWcagAA("#FFFFFF")).toBe(false);
  });

  it("respects a custom threshold", () => {
    // 3:1 threshold (large text AA)
    expect(meetsWcagAA("#767676", "#FFFFFF", 3)).toBe(true);
  });
});

describe("ACCENT_PALETTE", () => {
  it("contains at least 8 colours", () => {
    expect(ACCENT_PALETTE.length).toBeGreaterThanOrEqual(8);
  });

  it("all palette entries have valid hex values", () => {
    ACCENT_PALETTE.forEach((colour) => {
      expect(hexToRgb(colour.value)).not.toBeNull();
    });
  });
});

describe("DEFAULT_ACCENT_COLOR", () => {
  it("is a valid hex colour", () => {
    expect(hexToRgb(DEFAULT_ACCENT_COLOR)).not.toBeNull();
  });
});
