/**
 * Lightweight feature-flag helpers.
 *
 * Flags are resolved from:
 *   1. Environment variable  NEXT_PUBLIC_FLAGS  (comma-separated list of enabled flags)
 *   2. localStorage override (only in browser, useful for QA / A-B testing)
 *
 * ⚠️  SECURITY NOTE: The localStorage override is intentionally available to
 * end-users to support QA and A/B testing workflows.  This mechanism must
 * NEVER be used to gate security-sensitive functionality (e.g. access control,
 * billing features, admin capabilities).  It is safe only for UI/UX feature
 * rollouts where a motivated user enabling the flag early causes no harm.
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
  // See security note in the module comment above.
  try {
    const override = localStorage.getItem(`flag:${flag}`);
    if (override === "1" || override === "true") return true;
    if (override === "0" || override === "false") return false;
  } catch {
    // localStorage unavailable (e.g. incognito with strict settings).
  }

  return ENV_FLAGS.has(flag);
}
