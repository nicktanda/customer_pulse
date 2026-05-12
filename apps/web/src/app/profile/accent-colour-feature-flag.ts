/**
 * Feature flag for the accent colour personalisation feature.
 *
 * Control rollout via the NEXT_PUBLIC_FEATURE_ACCENT_COLOUR environment variable:
 *   - "true"  → enabled for all users
 *   - "false" → disabled (default / safe fallback)
 *   - "ab"    → A/B mode: enabled for ~50 % of users based on a stable session hash
 *
 * The flag is evaluated client-side so it can read cookies / localStorage
 * without a server round-trip.
 */

export type AccentColourFlagMode = "true" | "false" | "ab";

/** Exported so tests can reference the key directly */
export const AB_BUCKET_STORAGE_KEY = "__accent_ab_bucket";

function getFlagMode(): AccentColourFlagMode {
  const raw =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_FEATURE_ACCENT_COLOUR) ??
    "false";
  if (raw === "true" || raw === "ab") return raw;
  return "false";
}

/**
 * Stable, session-scoped bucket assignment for A/B testing.
 * Uses a random value written to localStorage so the assignment
 * is consistent across page loads for the same browser session.
 */
function getAbBucket(): "a" | "b" {
  if (typeof localStorage === "undefined") return "a";
  const stored = localStorage.getItem(AB_BUCKET_STORAGE_KEY);
  if (stored === "a" || stored === "b") return stored;
  const bucket = Math.random() < 0.5 ? "a" : "b";
  localStorage.setItem(AB_BUCKET_STORAGE_KEY, bucket);
  return bucket;
}

/**
 * Returns true when the accent colour picker should be shown to this user.
 */
export function isAccentColourEnabled(): boolean {
  const mode = getFlagMode();
  if (mode === "true") return true;
  if (mode === "false") return false;
  // A/B mode – show to bucket "b"
  return getAbBucket() === "b";
}
