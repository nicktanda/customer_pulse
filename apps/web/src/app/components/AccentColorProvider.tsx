"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";

const STORAGE_KEY = "user_accent_color";
const DEFAULT_ACCENT = "#6366f1";
const CSS_VAR = "--color-accent";
const FEATURE_FLAG_KEY = "feature_accent_color";

interface AccentColorContextValue {
  accentColor: string;
  setAccentColor: (color: string) => void;
  isEnabled: boolean;
}

const AccentColorContext = createContext<AccentColorContextValue>({
  accentColor: DEFAULT_ACCENT,
  setAccentColor: () => undefined,
  isEnabled: false,
});

/**
 * Read the feature flag from localStorage (or environment variable fallback).
 * In production, replace this with your actual feature-flag SDK call.
 */
function isFeatureEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(FEATURE_FLAG_KEY);
  if (stored !== null) return stored === "true";
  // Fallback: enable via env variable at build time
  return process.env.NEXT_PUBLIC_FEATURE_ACCENT_COLOR === "true";
}

function applyAccentColor(color: string) {
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty(CSS_VAR, color);
  }
}

function loadStoredColor(): string {
  if (typeof window === "undefined") return DEFAULT_ACCENT;
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_ACCENT;
}

interface AccentColorProviderProps {
  children: ReactNode;
  /** Optionally seed the colour from the server (e.g. from user profile). */
  initialColor?: string;
}

export function AccentColorProvider({
  children,
  initialColor,
}: AccentColorProviderProps) {
  const enabled = isFeatureEnabled();

  const [accentColor, setAccentColorState] = useState<string>(() => {
    if (!enabled) return DEFAULT_ACCENT;
    return initialColor ?? loadStoredColor();
  });

  // Apply the CSS variable on mount and whenever the colour changes.
  useEffect(() => {
    if (!enabled) {
      applyAccentColor(DEFAULT_ACCENT);
      return;
    }
    applyAccentColor(accentColor);
  }, [accentColor, enabled]);

  const setAccentColor = useCallback(
    (color: string) => {
      if (!enabled) return;
      setAccentColorState(color);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, color);
      }
    },
    [enabled]
  );

  return (
    <AccentColorContext.Provider
      value={{ accentColor, setAccentColor, isEnabled: enabled }}
    >
      {children}
    </AccentColorContext.Provider>
  );
}

export function useAccentColor(): AccentColorContextValue {
  return useContext(AccentColorContext);
}
