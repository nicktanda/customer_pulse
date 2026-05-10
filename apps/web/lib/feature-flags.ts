/**
 * Lightweight feature-flag helpers.
 *
 * Flags are resolved from:
 *   1. Environment variable  NEXT_PUBLIC_FLAGS  (comma-separated list of enabled flags)
 *   2. localStorage override (only in browser, useful for QA / A-B testing)
 *
 * Usage:
 *   import { isFlagEnabled } from "@/lib/feature-flags";
 *   if (isFlagEnabled("accent-color")) { ... }
 */

export type FeatureFlag = "accent-color";

const ENV_FLAGS: Set<string> = new Set(
  (process.env.NEXT_PUBLIC_FLAGS ?? "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean)
);

export function isFlagEnabled(flag: FeatureFlag): boolean {
  // Server-side: env only.
  if (typeof window === "undefined") {
    return ENV_FLAGS.has(flag);
  }

  // Browser: allow localStorage override for A/B and QA.
  try {
    const override = localStorage.getItem(`flag:${flag}`);
    if (override === "1" || override === "true") return true;
    if (override === "0" || override === "false") return false;
  } catch {
    // localStorage unavailable (e.g. incognito with strict settings).
  }

  return ENV_FLAGS.has(flag);
}
