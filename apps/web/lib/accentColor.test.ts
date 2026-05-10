import {
  contrastRatio,
  hexToLuminance,
  isValidHex,
  passesWcagAA,
} from "./accentColor";

describe("hexToLuminance", () => {
  it("returns 1 for white", () => {
    expect(hexToLuminance("#ffffff")).toBeCloseTo(1);
  });

  it("returns 0 for black", () => {
    expect(hexToLuminance("#000000")).toBeCloseTo(0);
  });

  it("handles shorthand hex", () => {
    expect(hexToLuminance("#fff")).toBeCloseTo(1);
  });
});

describe("contrastRatio", () => {
  it("returns 21 for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21);
  });

  it("returns 1 for identical colours", () => {
    expect(contrastRatio("#6366f1", "#6366f1")).toBeCloseTo(1);
  });
});

describe("passesWcagAA", () => {
  it("passes for a sufficiently dark colour on white", () => {
    expect(passesWcagAA("#1d4ed8")).toBe(true); // blue-700
  });

  it("fails for a too-light colour on white", () => {
    expect(passesWcagAA("#fde68a")).toBe(false); // amber-200
  });

  it("fails for white on white", () => {
    expect(passesWcagAA("#ffffff")).toBe(false);
  });
});

describe("isValidHex", () => {
  it("accepts 6-digit hex", () => {
    expect(isValidHex("#6366f1")).toBe(true);
  });

  it("accepts 3-digit hex", () => {
    expect(isValidHex("#abc")).toBe(true);
  });

  it("rejects values without #", () => {
    expect(isValidHex("6366f1")).toBe(false);
  });

  it("rejects non-hex characters", () => {
    expect(isValidHex("#xyz123")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidHex("")).toBe(false);
  });
});
