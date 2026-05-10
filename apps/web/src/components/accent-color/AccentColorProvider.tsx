"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { DEFAULT_ACCENT } from "./AccentColorPicker";

const STORAGE_KEY = "user_accent_color";
const FEATURE_FLAG_KEY = "feature_accent_color";

interface AccentColorContextValue {
  accentColor: string;
  setAccentColor: (color: string) => void;
  isFeatureEnabled: boolean;
}

const AccentColorContext = createContext<AccentColorContextValue>({
  accentColor: DEFAULT_ACCENT,
  setAccentColor: () => undefined,
  isFeatureEnabled: false,
});

function isFeatureFlagEnabled(): boolean {
  if (typeof window === "undefined") return false;
  // Feature flag: check localStorage or env variable
  // In production, wire this up to your flag service (e.g. LaunchDarkly, PostHog)
  const localOverride = localStorage.getItem(FEATURE_FLAG_KEY);
  if (localOverride !== null) return localOverride === "true";
  // Default: enabled in development, disabled in production until rollout
  return process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_FEATURE_ACCENT_COLOR === "true";
}

interface AccentColorProviderProps {
  children: ReactNode;
  /** Optional server-side initial value (e.g. from user profile in DB) */
  initialColor?: string;
}

export function AccentColorProvider({
  children,
  initialColor,
}: AccentColorProviderProps) {
  const [accentColor, setAccentColorState] = useState<string>(
    initialColor ?? DEFAULT_ACCENT
  );
  const [isFeatureEnabled, setIsFeatureEnabled] = useState(false);

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    const featureOn = isFeatureFlagEnabled();
    setIsFeatureEnabled(featureOn);

    if (!featureOn) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setAccentColorState(stored);
    } else if (initialColor) {
      setAccentColorState(initialColor);
    }
  }, [initialColor]);

  // Apply CSS custom property whenever accentColor changes
  useEffect(() => {
    if (!isFeatureEnabled) return;
    document.documentElement.style.setProperty("--color-accent", accentColor);
    // Also update the focus-visible ring colour for accessibility
    document.documentElement.style.setProperty(
      "--color-accent-ring",
      accentColor
    );
  }, [accentColor, isFeatureEnabled]);

  const setAccentColor = useCallback(
    (color: string) => {
      setAccentColorState(color);
      if (typeof window !== "undefined" && isFeatureEnabled) {
        localStorage.setItem(STORAGE_KEY, color);
      }
    },
    [isFeatureEnabled]
  );

  return (
    <AccentColorContext.Provider
      value={{ accentColor, setAccentColor, isFeatureEnabled }}
    >
      {children}
    </AccentColorContext.Provider>
  );
}

export function useAccentColor(): AccentColorContextValue {
  return useContext(AccentColorContext);
}
