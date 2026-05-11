import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isFeatureEnabled } from '../feature-flags';

describe('isFeatureEnabled', () => {
  const FLAG = 'NEXT_PUBLIC_FLAG_TEST_FLAG';

  beforeEach(() => {
    delete process.env[FLAG];
  });

  afterEach(() => {
    delete process.env[FLAG];
  });

  it('returns false when the env var is not set', () => {
    expect(isFeatureEnabled(FLAG)).toBe(false);
  });

  it('returns true when the env var is set to "true"', () => {
    process.env[FLAG] = 'true';
    expect(isFeatureEnabled(FLAG)).toBe(true);
  });

  it('returns false when the env var is set to "false"', () => {
    process.env[FLAG] = 'false';
    expect(isFeatureEnabled(FLAG)).toBe(false);
  });

  it('returns false for truthy but non-"true" values', () => {
    process.env[FLAG] = '1';
    expect(isFeatureEnabled(FLAG)).toBe(false);

    process.env[FLAG] = 'yes';
    expect(isFeatureEnabled(FLAG)).toBe(false);
  });

  it('ignores userId when evaluating the flag', () => {
    process.env[FLAG] = 'true';
    expect(isFeatureEnabled(FLAG, 'user-123')).toBe(true);
    expect(isFeatureEnabled(FLAG, 'another-user')).toBe(true);
  });
});
