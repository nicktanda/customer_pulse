import {
  contrastRatio,
  hexToRgb,
  isValidHex,
  meetsWcagAA,
} from "./accentColor";

describe("hexToRgb", () => {
  it("parses a valid hex colour", () => {
    expect(hexToRgb("#4F46E5")).toEqual({ r: 79, g: 70, b: 229 });
  });

  it("returns null for an invalid hex", () => {
    expect(hexToRgb("#GGGGGG")).toBeNull();
    expect(hexToRgb("not-a-colour")).toBeNull();
  });
});

describe("contrastRatio", () => {
  it("returns ~21 for black on white", () => {
    const ratio = contrastRatio("#000000", "#FFFFFF");
    expect(ratio).toBeCloseTo(21, 0);
  });

  it("returns 1 for identical colours", () => {
    const ratio = contrastRatio("#4F46E5", "#4F46E5");
    expect(ratio).toBeCloseTo(1, 1);
  });
});

describe("meetsWcagAA", () => {
  it("passes for a dark enough colour (indigo)", () => {
    expect(meetsWcagAA("#4F46E5")).toBe(true);
  });

  it("fails for a very light colour (yellow)", () => {
    expect(meetsWcagAA("#FBBF24")).toBe(false);
  });
});

describe("isValidHex", () => {
  it("accepts valid 6-digit hex with hash", () => {
    expect(isValidHex("#4F46E5")).toBe(true);
    expect(isValidHex("#ffffff")).toBe(true);
  });

  it("rejects short-form and missing hash", () => {
    expect(isValidHex("#FFF")).toBe(false);
    expect(isValidHex("4F46E5")).toBe(false);
    expect(isValidHex("")).toBe(false);
  });
});
