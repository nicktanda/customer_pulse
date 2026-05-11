import {
  isValidHex,
  relativeLuminance,
  contrastRatio,
  passesWcagAA,
  ACCENT_COLOR_PALETTE,
  DEFAULT_ACCENT_COLOR,
} from '../accent-color';

describe('isValidHex', () => {
  it('accepts valid 6-digit hex strings', () => {
    expect(isValidHex('#000000')).toBe(true);
    expect(isValidHex('#ffffff')).toBe(true);
    expect(isValidHex('#6366f1')).toBe(true);
    expect(isValidHex('#AABBCC')).toBe(true);
  });

  it('rejects short-form hex', () => {
    expect(isValidHex('#fff')).toBe(false);
    expect(isValidHex('#abc')).toBe(false);
  });

  it('rejects 8-digit (alpha) hex', () => {
    expect(isValidHex('#rrggbbaa')).toBe(false);
    expect(isValidHex('#6366f1ff')).toBe(false);
  });

  it('rejects strings without leading #', () => {
    expect(isValidHex('6366f1')).toBe(false);
    expect(isValidHex('ffffff')).toBe(false);
  });

  it('rejects empty and non-hex strings', () => {
    expect(isValidHex('')).toBe(false);
    expect(isValidHex('red')).toBe(false);
    expect(isValidHex('#gggggg')).toBe(false);
  });
});

describe('relativeLuminance', () => {
  it('returns 0 for black', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
  });

  it('returns 1 for white', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
  });

  it('returns null for invalid hex', () => {
    expect(relativeLuminance('#fff')).toBeNull();
    expect(relativeLuminance('notahex')).toBeNull();
  });

  it('returns null for 6-char non-hex strings (e.g. zzzzzz)', () => {
    // Previously hexToRgb only checked length, allowing NaN to propagate.
    // The fix adds character validation so these now correctly return null.
    expect(relativeLuminance('#zzzzzz')).toBeNull();
  });

  it('returns a value between 0 and 1 for mid-range colours', () => {
    const l = relativeLuminance('#6366f1');
    expect(l).not.toBeNull();
    expect(l!).toBeGreaterThan(0);
    expect(l!).toBeLessThan(1);
  });
});

describe('contrastRatio', () => {
  it('returns 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });

  it('returns 1:1 for identical colours', () => {
    expect(contrastRatio('#6366f1', '#6366f1')).toBeCloseTo(1, 5);
  });

  it('returns null when either colour is invalid', () => {
    expect(contrastRatio('#fff', '#000000')).toBeNull();
    expect(contrastRatio('#000000', 'bad')).toBeNull();
  });

  it('returns null for 6-char non-hex strings', () => {
    expect(contrastRatio('#zzzzzz', '#ffffff')).toBeNull();
  });

  it('is symmetric', () => {
    const ab = contrastRatio('#6366f1', '#ffffff');
    const ba = contrastRatio('#ffffff', '#6366f1');
    expect(ab).toBeCloseTo(ba!, 5);
  });
});

describe('passesWcagAA', () => {
  it('returns true for black (21:1 against white)', () => {
    expect(passesWcagAA('#000000')).toBe(true);
  });

  it('returns false for white on white (1:1)', () => {
    expect(passesWcagAA('#ffffff')).toBe(false);
  });

  it('correctly identifies that default indigo does not pass AA against white', () => {
    // #6366f1 has ~3.0:1 contrast against white — below the 4.5:1 threshold.
    expect(passesWcagAA(DEFAULT_ACCENT_COLOR)).toBe(false);
  });

  it('returns true for dark colours that pass 4.5:1', () => {
    // #475569 (Slate-600) has sufficient contrast.
    expect(passesWcagAA('#475569')).toBe(true);
  });

  it('returns false for invalid hex', () => {
    expect(passesWcagAA('#fff')).toBe(false);
  });

  it('returns false for 6-char non-hex strings', () => {
    expect(passesWcagAA('#zzzzzz')).toBe(false);
  });
});

describe('ACCENT_COLOR_PALETTE', () => {
  it('contains exactly 10 swatches', () => {
    expect(ACCENT_COLOR_PALETTE).toHaveLength(10);
  });

  it('all swatches have valid 6-digit hex values', () => {
    for (const swatch of ACCENT_COLOR_PALETTE) {
      expect(isValidHex(swatch.value)).toBe(true);
    }
  });

  it('all swatches have non-empty labels', () => {
    for (const swatch of ACCENT_COLOR_PALETTE) {
      expect(swatch.label.length).toBeGreaterThan(0);
    }
  });
});
