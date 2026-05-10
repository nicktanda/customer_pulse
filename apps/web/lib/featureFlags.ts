/**
 * featureFlags.ts
 *
 * Thin wrapper around environment-variable-based feature flags.
 * All flags default to disabled (false) when the env var is absent or
 * set to anything other than the string "true".
 */

const FLAGS = {
  ACCENT_COLOR_PICKER: process.env.NEXT_PUBLIC_FF_ACCENT_COLOR_PICKER,
} as const;

export type FeatureFlag = keyof typeof FLAGS;

/**
 * Returns true if the given feature flag is enabled.
 * Never throws — a missing env var is treated as disabled.
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  try {
    return FLAGS[flag] === "true";
  } catch {
    return false;
  }
}
