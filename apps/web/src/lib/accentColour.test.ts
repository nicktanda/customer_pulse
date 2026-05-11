/**
 * Unit tests for accentColour utilities.
 * Run with: jest apps/web/src/lib/accentColour.test.ts
 */
import {
  contrastRatio,
  passesWCAG_AA,
  accentForeground,
  isValidHex,
  DEFAULT_ACCENT,
} from './accentColour';

describe('isValidHex', () => {
  it('accepts 6-char hex with hash', () => {
    expect(isValidHex('#6366f1')).toBe(true);
  });
  it('accepts 3-char hex with hash', () => {
    expect(isValidHex('#fff')).toBe(true);
  });
  it('rejects hex without hash', () => {
    expect(isValidHex('6366f1')).toBe(false);
  });
  it('rejects invalid length', () => {
    expect(isValidHex('#12345')).toBe(false);
  });
});

describe('contrastRatio', () => {
  it('returns ~21 for black on white', () => {
    const ratio = contrastRatio('#000000', '#ffffff');
    expect(ratio).toBeCloseTo(21, 0);
  });
  it('returns 1 for same colour', () => {
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 1);
  });
});

describe('passesWCAG_AA', () => {
  it('default accent passes against white', () => {
    expect(passesWCAG_AA(DEFAULT_ACCENT)).toBe(true);
  });
  it('white fails against white', () => {
    expect(passesWCAG_AA('#ffffff', '#ffffff')).toBe(false);
  });
  it('black passes against white', () => {
    expect(passesWCAG_AA('#000000', '#ffffff')).toBe(true);
  });
});

describe('accentForeground', () => {
  it('returns white foreground for dark accent', () => {
    expect(accentForeground('#000000')).toBe('#ffffff');
  });
  it('returns dark foreground for light accent', () => {
    expect(accentForeground('#ffffff')).toBe('#111827');
  });
});
