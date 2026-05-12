import {
  isValidHex,
  hexToLuminance,
  contrastRatio,
  meetsWcagAA,
} from "./color";

describe("isValidHex", () => {
  it("accepts a valid 6-digit hex with hash", () => {
    expect(isValidHex("#6366f1")).toBe(true);
    expect(isValidHex("#000000")).toBe(true);
    expect(isValidHex("#FFFFFF")).toBe(true);
    expect(isValidHex("#aAbBcC")).toBe(true);
  });

  it("rejects 3-digit shorthand hex", () => {
    expect(isValidHex("#fff")).toBe(false);
  });

  it("rejects hex without hash", () => {
    expect(isValidHex("6366f1")).toBe(false);
  });

  it("rejects strings with invalid characters", () => {
    expect(isValidHex("#zzzzzz")).toBe(false);
    expect(isValidHex("#12345g")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidHex("")).toBe(false);
  });

  it("rejects hex that is too long", () => {
    expect(isValidHex("#6366f1aa")).toBe(false);
  });
});

describe("hexToLuminance", () => {
  it("returns 0 for black", () => {
    expect(hexToLuminance("#000000")).toBeCloseTo(0, 5);
  });

  it("returns 1 for white", () => {
    expect(hexToLuminance("#ffffff")).toBeCloseTo(1, 5);
  });

  it("returns a value between 0 and 1 for mid-tones", () => {
    const lum = hexToLuminance("#6366f1");
    expect(lum).toBeGreaterThan(0);
    expect(lum).toBeLessThan(1);
  });
});

describe("contrastRatio", () => {
  it("returns 21 for black vs white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });

  it("returns 1 for a colour against itself", () => {
    expect(contrastRatio("#6366f1", "#6366f1")).toBeCloseTo(1, 5);
  });

  it("is commutative", () => {
    const a = contrastRatio("#6366f1", "#ffffff");
    const b = contrastRatio("#ffffff", "#6366f1");
    expect(a).toBeCloseTo(b, 10);
  });
});

describe("meetsWcagAA", () => {
  it("passes black on white (ratio 21:1)", () => {
    expect(meetsWcagAA("#000000", "#ffffff")).toBe(true);
  });

  it("fails white on white (ratio 1:1)", () => {
    expect(meetsWcagAA("#ffffff", "#ffffff")).toBe(false);
  });

  it("defaults background to white", () => {
    // #000000 on #ffffff passes
    expect(meetsWcagAA("#000000")).toBe(true);
  });

  it("returns false for an invalid hex", () => {
    expect(meetsWcagAA("notacolor")).toBe(false);
  });

  it("checks against a dark background correctly", () => {
    // Pure white on a very dark background should pass
    expect(meetsWcagAA("#ffffff", "#1a1a2e")).toBe(true);
    // A mid-range colour on dark background may fail or pass
    const ratio = contrastRatio("#6366f1", "#1a1a2e");
    expect(meetsWcagAA("#6366f1", "#1a1a2e")).toBe(ratio >= 4.5);
  });
});
