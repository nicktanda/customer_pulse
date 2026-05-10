import {
  contrastRatio,
  isWcagAA,
  isValidHex,
  ACCENT_PALETTE,
} from "@/lib/accent-color";

describe("isValidHex", () => {
  it("accepts valid 6-digit hex with #", () => {
    expect(isValidHex("#2563EB")).toBe(true);
    expect(isValidHex("#ffffff")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidHex("2563EB")).toBe(false); // missing #
    expect(isValidHex("#FFF")).toBe(false); // 3-digit
    expect(isValidHex("#ZZZZZZ")).toBe(false); // non-hex chars
    expect(isValidHex("")).toBe(false);
  });
});

describe("contrastRatio", () => {
  it("returns 21 for black on white", () => {
    const ratio = contrastRatio("#000000", "#FFFFFF");
    expect(ratio).toBeCloseTo(21, 0);
  });

  it("returns 1 for white on white", () => {
    const ratio = contrastRatio("#FFFFFF", "#FFFFFF");
    expect(ratio).toBeCloseTo(1, 1);
  });

  it("returns null for invalid input", () => {
    expect(contrastRatio("invalid")).toBeNull();
  });
});

describe("isWcagAA", () => {
  it("passes brand blue against white", () => {
    expect(isWcagAA("#2563EB")).toBe(true);
  });

  it("fails a very light colour against white", () => {
    expect(isWcagAA("#E0E7FF")).toBe(false);
  });
});

describe("ACCENT_PALETTE", () => {
  it("contains at least 8 colours", () => {
    expect(ACCENT_PALETTE.length).toBeGreaterThanOrEqual(8);
  });

  it("all palette entries have valid hex values", () => {
    ACCENT_PALETTE.forEach((color) => {
      expect(isValidHex(color.value)).toBe(true);
    });
  });

  it("all palette entries pass WCAG AA against white", () => {
    ACCENT_PALETTE.forEach((color) => {
      expect(isWcagAA(color.value)).toBe(true);
    });
  });
});
