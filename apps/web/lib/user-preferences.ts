/**
 * Thin abstraction around user-preference persistence.
 *
 * The accent colour is stored in localStorage so it works without a backend
 * migration. The /api/user/accent-color cookie-based route exists as a
 * parallel path for future cross-device/server-side sync; this module is the
 * single source of truth read by AccentColorProvider until that migration
 * lands.
 */

import { DEFAULT_ACCENT_COLOR, isValidHex } from "./accent-color";

const ACCENT_KEY = "user-pref:accent-color";

export function getStoredAccentColor(): string {
  if (typeof window === "undefined") return DEFAULT_ACCENT_COLOR;
  try {
    const stored = localStorage.getItem(ACCENT_KEY);
    if (stored && isValidHex(stored)) return stored;
  } catch {
    // ignore
  }
  return DEFAULT_ACCENT_COLOR;
}

export function storeAccentColor(hex: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACCENT_KEY, hex);
  } catch {
    // ignore
  }
}

export function clearAccentColor(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ACCENT_KEY);
  } catch {
    // ignore
  }
}
