/**
 * Lightweight feature-flag helpers.
 * Flags are read from NEXT_PUBLIC_* environment variables so they can be
 * toggled at build / deploy time without a code change.
 *
 * For A/B testing, the flag value may be "enabled", "disabled", or "ab".
 * In "ab" mode, 50 % of users (determined by a stable random cookie) see
 * the feature.
 */

export type FlagValue = "enabled" | "disabled" | "ab";

function readFlag(name: string): FlagValue {
  const raw =
    (typeof process !== "undefined" && process.env[name]) || "disabled";
  if (raw === "enabled" || raw === "ab") return raw;
  return "disabled";
}

/**
 * Accent colour picker feature flag.
 * Set NEXT_PUBLIC_FLAG_ACCENT_COLOR=enabled|ab to activate.
 */
export const FLAG_ACCENT_COLOR = readFlag("NEXT_PUBLIC_FLAG_ACCENT_COLOR");

/**
 * Resolve whether a feature is active for the current session.
 * For "ab" flags we use a stable per-browser value stored in localStorage.
 */
export function isFlagEnabled(flag: FlagValue, flagKey: string): boolean {
  if (flag === "disabled") return false;
  if (flag === "enabled") return true;

  // "ab" branch – stable 50/50 split
  if (typeof window === "undefined") return false;
  const storageKey = `feature_ab_${flagKey}`;
  const stored = localStorage.getItem(storageKey);
  if (stored === "1" || stored === "0") return stored === "1";
  const bucket = Math.random() < 0.5 ? "1" : "0";
  localStorage.setItem(storageKey, bucket);
  return bucket === "1";
}
