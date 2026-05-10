/**
 * Lightweight feature-flag helper.
 *
 * Flags are resolved from environment variables at build / runtime.
 * Add new flags here so that all flag checks are in one place.
 */

export type FeatureFlag = "ACCENT_COLOR_PICKER";

/**
 * Returns true when the given feature flag is enabled.
 *
 * Convention:
 *   NEXT_PUBLIC_FF_<FLAG_NAME>=true  → enabled
 *   (absent or any other value)      → disabled
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const envKey = `NEXT_PUBLIC_FF_${flag}` as keyof typeof process.env;
  return process.env[envKey] === "true";
}
