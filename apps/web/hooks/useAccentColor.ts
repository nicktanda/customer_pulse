import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_ACCENT_COLOR,
  ACCENT_LS_KEY,
  applyAccentColor,
  isValidHex,
  storeAccentColor,
  readStoredAccentColor,
} from "../lib/accentColor";

export interface UseAccentColorReturn {
  /** Currently active accent colour (hex string). */
  accentColor: string;
  /** Update the accent colour locally (instant preview) without saving to server. */
  setAccentColor: (hex: string) => void;
  /** Persist to the server. Exposes save error via `saveError`. */
  saveAccentColor: (hex: string) => Promise<void>;
  /** Whether the server save is in progress. */
  isSaving: boolean;
  /** Non-null when the most recent save attempt failed. */
  saveError: string | null;
}

/**
 * Manages the user's accent colour preference.
 *
 * On mount it reads from localStorage (fast, avoids flash of default colour)
 * and applies the CSS custom property.  When the user changes their colour
 * the hook updates state, persists to localStorage, and can optionally call
 * the server API.
 */
export function useAccentColor(
  /** Colour already stored on the server (from profile API). */
  serverValue?: string | null
): UseAccentColorReturn {
  // readStoredAccentColor is SSR-safe (returns null on server)
  const initial =
    (serverValue && isValidHex(serverValue) ? serverValue : null) ??
    readStoredAccentColor() ??
    DEFAULT_ACCENT_COLOR;

  const [accentColor, setAccentColorState] = useState<string>(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Apply on mount and whenever the value changes
  useEffect(() => {
    applyAccentColor(accentColor);
  }, [accentColor]);

  // Sync from server value when it arrives (e.g. after auth)
  useEffect(() => {
    if (serverValue && isValidHex(serverValue)) {
      setAccentColorState(serverValue);
    }
  }, [serverValue]);

  const setAccentColor = useCallback((hex: string) => {
    if (!isValidHex(hex)) return;
    setAccentColorState(hex);
    storeAccentColor(hex);
    applyAccentColor(hex);
  }, []);

  /**
   * Persist the colour to the server.
   *
   * Replace the fetch call below with your real API client.
   * The function is intentionally separated from `setAccentColor` so that
   * local preview (instant) and remote persistence (async) are decoupled.
   *
   * On success: also updates localStorage for fast next-load.
   * On failure: sets `saveError` so callers can render an error message.
   */
  const saveAccentColor = useCallback(async (hex: string): Promise<void> => {
    if (!isValidHex(hex)) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accentColor: hex }),
      });
      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }
      // Persist locally only after confirmed server success
      storeAccentColor(hex);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save preference";
      console.warn("[useAccentColor] Failed to save preference:", err);
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { accentColor, setAccentColor, saveAccentColor, isSaving, saveError };
}
