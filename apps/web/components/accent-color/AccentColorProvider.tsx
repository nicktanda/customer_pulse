"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { applyAccentColor, DEFAULT_ACCENT_COLOR, isValidHex } from "@/lib/accent-color";
import { isFlagEnabled } from "@/lib/feature-flags";
import { getStoredAccentColor, storeAccentColor, clearAccentColor } from "@/lib/user-preferences";

interface AccentColorContextValue {
  accentColor: string;
  setAccentColor: (hex: string) => void;
  resetAccentColor: () => void;
  isFeatureEnabled: boolean;
}

const AccentColorContext = createContext<AccentColorContextValue>({
  accentColor: DEFAULT_ACCENT_COLOR,
  setAccentColor: () => {},
  resetAccentColor: () => {},
  isFeatureEnabled: false,
});

export function AccentColorProvider({ children }: { children: React.ReactNode }) {
  const [accentColor, setAccentColorState] = useState<string>(DEFAULT_ACCENT_COLOR);
  const [isFeatureEnabled] = useState(() => isFlagEnabled("accent-color"));

  // Hydrate from localStorage on mount.
  // The /api/user/accent-color cookie-based route is a parallel persistence
  // path intended for future cross-device sync. Until that migration lands,
  // localStorage is the single source of truth read here.
  useEffect(() => {
    if (!isFeatureEnabled) return;
    const stored = getStoredAccentColor();
    setAccentColorState(stored);
    applyAccentColor(stored);
  }, [isFeatureEnabled]);

  const setAccentColor = useCallback(
    (hex: string) => {
      if (!isValidHex(hex)) return;
      setAccentColorState(hex);
      applyAccentColor(hex);
      storeAccentColor(hex);
    },
    []
  );

  const resetAccentColor = useCallback(() => {
    setAccentColorState(DEFAULT_ACCENT_COLOR);
    applyAccentColor(DEFAULT_ACCENT_COLOR);
    clearAccentColor();
  }, []);

  return (
    <AccentColorContext.Provider
      value={{ accentColor, setAccentColor, resetAccentColor, isFeatureEnabled }}
    >
      {children}
    </AccentColorContext.Provider>
  );
}

export function useAccentColor() {
  return useContext(AccentColorContext);
}
