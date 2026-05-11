import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ACCENT_COLOR_FEATURE_FLAG } from '../accent-color';

// We need to be able to set process.env values for testing.
// Vitest runs in Node so we can manipulate process.env directly.

describe('isFeatureEnabled', () => {
  // Store original env values and restore after each test.
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment.
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  });

  it('returns false when the flag env var is not set', async () => {
    delete process.env[ACCENT_COLOR_FEATURE_FLAG];
    const { isFeatureEnabled } = await import('../feature-flags');
    expect(isFeatureEnabled(ACCENT_COLOR_FEATURE_FLAG)).toBe(false);
  });

  it('returns false when the flag env var is set to "false"', async () => {
    process.env[ACCENT_COLOR_FEATURE_FLAG] = 'false';
    const { isFeatureEnabled } = await import('../feature-flags');
    expect(isFeatureEnabled(ACCENT_COLOR_FEATURE_FLAG)).toBe(false);
  });

  it('returns true when the flag env var is set to "true"', async () => {
    process.env[ACCENT_COLOR_FEATURE_FLAG] = 'true';
    const { isFeatureEnabled } = await import('../feature-flags');
    // Line 39 — this is the assertion that was failing.
    expect(isFeatureEnabled(ACCENT_COLOR_FEATURE_FLAG)).toBe(true);
  });

  it('returns true when the flag env var is set to "1"', async () => {
    process.env[ACCENT_COLOR_FEATURE_FLAG] = '1';
    const { isFeatureEnabled } = await import('../feature-flags');
    expect(isFeatureEnabled(ACCENT_COLOR_FEATURE_FLAG)).toBe(true);
  });

  it('returns false for an unknown flag', async () => {
    const { isFeatureEnabled } = await import('../feature-flags');
    expect(isFeatureEnabled('NEXT_PUBLIC_FLAG_NONEXISTENT')).toBe(false);
  });

  it('accepts an optional userId parameter without affecting the result', async () => {
    process.env[ACCENT_COLOR_FEATURE_FLAG] = 'true';
    const { isFeatureEnabled } = await import('../feature-flags');
    expect(isFeatureEnabled(ACCENT_COLOR_FEATURE_FLAG, 'user-123')).toBe(true);
  });
});
