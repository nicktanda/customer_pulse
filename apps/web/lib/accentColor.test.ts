import {
  contrastRatio,
  meetsWcagAA,
  isValidHex,
  ACCENT_COLOR_SWATCHES,
  DEFAULT_ACCENT_COLOR,
} from "./accentColor";

describe("isValidHex", () => {
  it("accepts a 6-digit hex with hash", () => {
    expect(isValidHex("#6366f1")).toBe(true);
  });

  it("rejects 3-digit shorthand", () => {
    expect(isValidHex("#fff")).toBe(false);
  });

  it("rejects hex without hash", () => {
    expect(isValidHex("6366f1")).toBe(false);
  });

  it("rejects non-hex characters", () => {
    expect(isValidHex("#zzzzzz")).toBe(false);
  });
});

describe("contrastRatio", () => {
  it("returns 21 for black vs white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("returns 1 for identical colours", () => {
    expect(contrastRatio("#6366f1", "#6366f1")).toBeCloseTo(1, 1);
  });
});

describe("meetsWcagAA", () => {
  it("passes for dark colours against white", () => {
    expect(meetsWcagAA("#1d4ed8")).toBe(true); // Blue-700
  });

  it("fails for very light colours against white", () => {
    expect(meetsWcagAA("#fde68a")).toBe(false); // Amber-200
  });
});

describe("ACCENT_COLOR_SWATCHES", () => {
  it("contains 10 swatches", () => {
    expect(ACCENT_COLOR_SWATCHES).toHaveLength(10);
  });

  it("all swatch values are valid hex strings", () => {
    ACCENT_COLOR_SWATCHES.forEach((swatch) => {
      expect(isValidHex(swatch.value)).toBe(true);
    });
  });
});

describe("DEFAULT_ACCENT_COLOR", () => {
  it("is a valid hex", () => {
    expect(isValidHex(DEFAULT_ACCENT_COLOR)).toBe(true);
  });

  it("meets WCAG AA against white", () => {
    expect(meetsWcagAA(DEFAULT_ACCENT_COLOR)).toBe(true);
  });
});
