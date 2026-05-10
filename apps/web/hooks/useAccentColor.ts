import { useCallback, useState } from "react";
import {
  applyAccentColor,
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT_COLOR,
  isValidHex,
  meetsWcagAA,
} from "../lib/accentColor";
import { FLAG_ACCENT_COLOR, isFlagEnabled } from "../lib/featureFlags";

export interface UseAccentColorReturn {
  /** Feature is active for this user */
  isEnabled: boolean;
  /** Currently active accent hex value */
  accentColor: string;
  /** True when the selected colour fails WCAG AA */
  hasContrastWarning: boolean;
  /** Update the accent colour (validates + persists) */
  setAccentColor: (hex: string) => void;
  /** Reset to the brand default */
  resetAccentColor: () => void;
}

export function useAccentColor(): UseAccentColorReturn {
  const isEnabled = isFlagEnabled(FLAG_ACCENT_COLOR, "accent_color");

  const [accentColor, setAccentColorState] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_ACCENT_COLOR;
    return localStorage.getItem(ACCENT_STORAGE_KEY) ?? DEFAULT_ACCENT_COLOR;
  });

  const [hasContrastWarning, setHasContrastWarning] = useState<boolean>(
    !meetsWcagAA(accentColor)
  );

  // Note: initial CSS injection is handled by AccentColorProvider in the root
  // layout so we avoid a double-apply and the stale-closure risk of an effect
  // here that would need accentColor in its dependency array.

  const setAccentColor = useCallback((hex: string) => {
    if (!isValidHex(hex)) return;
    setAccentColorState(hex);
    setHasContrastWarning(!meetsWcagAA(hex));
    applyAccentColor(hex);
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, hex);
    } catch {
      // storage unavailable – ignore
    }
  }, []);

  const resetAccentColor = useCallback(() => {
    setAccentColor(DEFAULT_ACCENT_COLOR);
    try {
      localStorage.removeItem(ACCENT_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, [setAccentColor]);

  return {
    isEnabled,
    accentColor,
    hasContrastWarning,
    setAccentColor,
    resetAccentColor,
  };
}
