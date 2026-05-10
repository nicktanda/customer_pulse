/**
 * Lightweight feature-flag helpers.
 * Flags are resolved from environment variables so they can be toggled
 * at deploy time without a code change.
 *
 * Convention: NEXT_PUBLIC_FF_<FLAG_NAME>=true|false
 */

export type FeatureFlag = "ACCENT_COLOR_PICKER";

const FLAG_ENV_KEYS: Record<FeatureFlag, string> = {
  ACCENT_COLOR_PICKER: "NEXT_PUBLIC_FF_ACCENT_COLOR_PICKER",
};

/**
 * Returns true when the feature flag is explicitly enabled.
 * Defaults to false so flags must be opted-in.
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  if (typeof process === "undefined") return false;
  const envKey = FLAG_ENV_KEYS[flag];
  return process.env[envKey]?.toLowerCase() === "true";
}
