/**
 * Lightweight feature-flag helper.
 *
 * In production you'd replace this with a real flag evaluation service
 * (LaunchDarkly, Statsig, homegrown, etc.). For now we read from
 * environment variables so the flag can be toggled per deployment without
 * a code change.
 *
 * To enable the accent colour picker:
 *   NEXT_PUBLIC_FLAG_ACCENT_COLOR_PICKER=true
 */

import { ACCENT_COLOR_FEATURE_FLAG } from './accent-color';

const FLAG_ENV_MAP: Record<string, string> = {
  [ACCENT_COLOR_FEATURE_FLAG]: 'NEXT_PUBLIC_FLAG_ACCENT_COLOR_PICKER',
};

/**
 * Evaluate a feature flag.
 *
 * @param flag  - Flag key (see ACCENT_COLOR_FEATURE_FLAG etc.)
 * @param _userId - Reserved for future per-user / A/B evaluation.
 */
export function isFeatureEnabled(flag: string, _userId?: string): boolean {
  const envKey = FLAG_ENV_MAP[flag];
  if (!envKey) return false;
  const raw = process.env[envKey];
  return raw === 'true' || raw === '1';
}
