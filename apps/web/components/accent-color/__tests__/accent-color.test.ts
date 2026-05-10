import {
  contrastRatio,
  isWcagAA,
  isValidHex,
  ACCENT_PALETTE,
  DEFAULT_ACCENT_COLOR,
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

  it("returns null for invalid foreground input (single-arg form uses default white background)", () => {
    // "invalid" has no leading # so hexToRgb returns null → contrastRatio returns null.
    expect(contrastRatio("invalid")).toBeNull();
  });

  it("returns null for invalid background input", () => {
    expect(contrastRatio("#000000", "invalid")).toBeNull();
  });

  it("returns a reasonable ratio for two non-black/white colours", () => {
    // #2563EB (brand blue) vs #F3F4F6 (light grey background)
    const ratio = contrastRatio("#2563EB", "#F3F4F6");
    expect(ratio).not.toBeNull();
    // Should be a positive number less than 21
    expect(ratio!).toBeGreaterThan(1);
    expect(ratio!).toBeLessThan(21);
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

describe("DEFAULT_ACCENT_COLOR", () => {
  it("is a valid 6-digit hex string", () => {
    expect(isValidHex(DEFAULT_ACCENT_COLOR)).toBe(true);
  });

  it("passes WCAG AA against white", () => {
    expect(isWcagAA(DEFAULT_ACCENT_COLOR)).toBe(true);
  });

  it("is independent of palette order (explicit named constant)", () => {
    // DEFAULT_ACCENT_COLOR must equal the brand blue value regardless of
    // where it appears in ACCENT_PALETTE.
    expect(DEFAULT_ACCENT_COLOR).toBe("#2563EB");
  });
});
