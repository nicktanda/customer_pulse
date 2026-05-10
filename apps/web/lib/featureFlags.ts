/**
 * Feature flags
 *
 * Simple environment-variable-backed feature flags.
 * In production these can be overridden per-user via a database or
 * a third-party flag service; for now env vars provide the gate.
 */

/** Returns true when the accent-colour personalisation feature is enabled. */
export function isAccentColorEnabled(): boolean {
  // Allow opt-in via env var (set NEXT_PUBLIC_FEATURE_ACCENT_COLOR=true)
  return process.env.NEXT_PUBLIC_FEATURE_ACCENT_COLOR === "true";
}
