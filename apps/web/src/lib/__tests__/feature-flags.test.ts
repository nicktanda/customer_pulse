import { isFeatureEnabled } from '../feature-flags';
import { ACCENT_COLOR_FEATURE_FLAG } from '../accent-color';

describe('isFeatureEnabled', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns false when the env var is not set', () => {
    delete process.env.NEXT_PUBLIC_FLAG_ACCENT_COLOR_PICKER;
    expect(isFeatureEnabled(ACCENT_COLOR_FEATURE_FLAG)).toBe(false);
  });

  it('returns true when the env var is "true"', () => {
    process.env.NEXT_PUBLIC_FLAG_ACCENT_COLOR_PICKER = 'true';
    expect(isFeatureEnabled(ACCENT_COLOR_FEATURE_FLAG)).toBe(true);
  });

  it('returns true when the env var is "1"', () => {
    process.env.NEXT_PUBLIC_FLAG_ACCENT_COLOR_PICKER = '1';
    expect(isFeatureEnabled(ACCENT_COLOR_FEATURE_FLAG)).toBe(true);
  });

  it('returns false when the env var is "false"', () => {
    process.env.NEXT_PUBLIC_FLAG_ACCENT_COLOR_PICKER = 'false';
    expect(isFeatureEnabled(ACCENT_COLOR_FEATURE_FLAG)).toBe(false);
  });

  it('returns false when the env var is "0"', () => {
    process.env.NEXT_PUBLIC_FLAG_ACCENT_COLOR_PICKER = '0';
    expect(isFeatureEnabled(ACCENT_COLOR_FEATURE_FLAG)).toBe(false);
  });

  it('returns false for unknown flag keys', () => {
    expect(isFeatureEnabled('nonexistent_flag')).toBe(false);
  });

  it('accepts optional userId parameter without affecting result', () => {
    process.env.NEXT_PUBLIC_FLAG_ACCENT_COLOR_PICKER = 'true';
    expect(isFeatureEnabled(ACCENT_COLOR_FEATURE_FLAG, 'user-123')).toBe(true);
  });
});
