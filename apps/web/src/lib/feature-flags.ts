/**
 * Feature flag utilities.
 *
 * Flags are controlled via environment variables. The naming convention is:
 *   NEXT_PUBLIC_FLAG_<FEATURE_NAME>=true
 *
 * `isFeatureEnabled` reads from `process.env` so it works in both server
 * and client contexts (NEXT_PUBLIC_ vars are inlined at build time for
 * client bundles by Next.js).
 *
 * Optionally accepts a `userId` for future per-user gradual rollout support
 * (currently unused — all enabled flags are enabled for all users).
 */

/**
 * Returns `true` when the feature identified by `flagName` is enabled.
 *
 * @param flagName - The environment variable name (e.g. `'NEXT_PUBLIC_FLAG_ACCENT_COLOR_PICKER'`).
 * @param _userId  - Reserved for future per-user gradual rollouts.
 */
export function isFeatureEnabled(flagName: string, _userId?: string): boolean {
  const value = process.env[flagName];
  return value === 'true' || value === '1';
}
