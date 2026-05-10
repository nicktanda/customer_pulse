/**
 * Feature flag helpers
 *
 * A lightweight wrapper around environment variables for feature flags.
 * Flags can be overridden per-user/per-session in the future (e.g. via
 * a database column or an external provider like LaunchDarkly).
 */

export type FeatureFlag = "accentColorPicker";

const FLAG_ENV_KEYS: Record<FeatureFlag, string> = {
  accentColorPicker: "NEXT_PUBLIC_FF_ACCENT_COLOR_PICKER",
};

/**
 * Returns true when the given feature flag is enabled.
 *
 * Reads from `process.env` which is inlined by Next.js at build time for
 * NEXT_PUBLIC_* variables, ensuring zero runtime overhead in production.
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const envKey = FLAG_ENV_KEYS[flag];
  const value = process.env[envKey];
  return value === "true" || value === "1";
}
