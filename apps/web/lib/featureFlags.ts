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
 * A flag is considered enabled when its corresponding environment variable
 * is set to the string `"true"` or `"1"` (case-insensitive).
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const key = FLAG_ENV_KEYS[flag];
  const value = process.env[key];
  return value === "true" || value === "1";
}
