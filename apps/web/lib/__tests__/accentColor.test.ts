import {
  contrastRatio,
  isValidHex,
  passesWcagAA,
  passesWcagAALarge,
  relativeLuminance,
} from "../accentColor";

describe("isValidHex", () => {
  it("accepts 6-digit hex strings", () => {
    expect(isValidHex("#6366f1")).toBe(true);
    expect(isValidHex("#ffffff")).toBe(true);
    expect(isValidHex("#000000")).toBe(true);
  });

  it("accepts 3-digit hex strings", () => {
    expect(isValidHex("#fff")).toBe(true);
    expect(isValidHex("#abc")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidHex("6366f1")).toBe(false); // missing #
    expect(isValidHex("#gggggg")).toBe(false); // invalid chars
    expect(isValidHex("#12345")).toBe(false); // 5 chars
    expect(isValidHex("")).toBe(false);
  });
});

describe("relativeLuminance", () => {
  it("returns 0 for black", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
  });

  it("returns 1 for white", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
  });

  it("returns null for invalid hex", () => {
    expect(relativeLuminance("notacolour")).toBeNull();
  });
});

describe("contrastRatio", () => {
  it("returns 21 for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("returns 1 for same colour", () => {
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });

  it("returns null for invalid inputs", () => {
    expect(contrastRatio("bad", "#ffffff")).toBeNull();
  });
});

describe("passesWcagAA", () => {
  it("passes for dark colours against white", () => {
    expect(passesWcagAA("#000000")).toBe(true);
    expect(passesWcagAA("#6366f1")).toBe(true); // Indigo-500 ~4.9:1
  });

  it("fails for very light colours against white", () => {
    expect(passesWcagAA("#ffffff")).toBe(false);
    expect(passesWcagAA("#f0f0f0")).toBe(false);
  });
});

describe("passesWcagAALarge", () => {
  it("passes for colours that meet the 3:1 threshold", () => {
    expect(passesWcagAALarge("#000000")).toBe(true);
    expect(passesWcagAALarge("#6366f1")).toBe(true);
  });

  it("fails for colours below 3:1", () => {
    expect(passesWcagAALarge("#ffffff")).toBe(false);
  });
});
