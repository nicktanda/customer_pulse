/**
 * Feature flag utilities.
 *
 * Flags are driven by `NEXT_PUBLIC_FLAG_*` environment variables so they are
 * available on both the server and the client.
 *
 * The optional `userId` parameter is accepted for future per-user flag
 * evaluation (e.g. percentage rollouts, allow-lists). It is currently unused.
 */

import { ACCENT_COLOR_FEATURE_FLAG } from './accent-color';

/** Map of flag keys to the environment variable that controls them. */
const FLAG_ENV_MAP: Record<string, string> = {
  [ACCENT_COLOR_FEATURE_FLAG]: 'NEXT_PUBLIC_FLAG_ACCENT_COLOR_PICKER',
};

/**
 * Returns `true` if the named feature flag is enabled.
 *
 * A flag is considered enabled when its corresponding environment variable is
 * set to the string `"true"` or `"1"` (case-insensitive).
 *
 * @param flagKey - One of the flag key constants (e.g. `ACCENT_COLOR_FEATURE_FLAG`).
 * @param userId  - Optional user ID for future per-user rollout support.
 */
export function isFeatureEnabled(flagKey: string, userId?: string): boolean {
  // userId is reserved for future per-user flag evaluation.
  void userId;

  const envVar = FLAG_ENV_MAP[flagKey];
  if (!envVar) return false;

  const value = process.env[envVar];
  if (!value) return false;

  return value === 'true' || value === '1';
}
