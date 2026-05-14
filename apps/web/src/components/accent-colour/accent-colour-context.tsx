"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  AccentColour,
  DEFAULT_ACCENT_ID,
  getAccentColour,
} from "./accent-colours";

const STORAGE_KEY = "xeno_accent_colour";

interface AccentColourContextValue {
  accent: AccentColour;
  setAccentId: (id: string) => void;
}

const AccentColourContext = createContext<AccentColourContextValue | null>(null);

function applyAccentToDOM(accent: AccentColour) {
  const root = document.documentElement;
  root.setAttribute("data-accent", accent.id);
  root.style.setProperty("--accent", accent.hex);
  root.style.setProperty("--accent-dark", accent.hexDark);
  root.style.setProperty("--accent-light", accent.hexLight);
  root.style.setProperty("--accent-on", accent.onColour);

  // Wire into Bootstrap / app-wide design tokens
  root.style.setProperty("--bs-primary", accent.hex);
  root.style.setProperty("--bs-primary-rgb", hexToRgbString(accent.hex));
  root.style.setProperty("--bs-link-color", accent.hex);
  root.style.setProperty("--bs-link-hover-color", accent.hexDark);
  root.style.setProperty("--bs-focus-ring-color", accent.hex + "40");
}

/**
 * Convert a 6-digit hex colour string to a CSS RGB string.
 * Only handles 6-digit hex (e.g. "#4f46e5" or "4f46e5").
 * All AccentColour entries are hardcoded as 6-digit hex values.
 */
function hexToRgbString(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) {
    // Fallback: return zeros rather than "NaN, NaN, NaN"
    return "0, 0, 0";
  }
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
}

export function AccentColourProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [accent, setAccent] = useState<AccentColour>(() =>
    getAccentColour(DEFAULT_ACCENT_ID)
  );

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const resolved = getAccentColour(stored);
        setAccent(resolved);
        applyAccentToDOM(resolved);
      } else {
        applyAccentToDOM(getAccentColour(DEFAULT_ACCENT_ID));
      }
    } catch {
      // localStorage unavailable (SSR guard)
    }
  }, []);

  const setAccentId = useCallback((id: string) => {
    const resolved = getAccentColour(id);
    setAccent(resolved);
    applyAccentToDOM(resolved);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  return (
    <AccentColourContext.Provider value={{ accent, setAccentId }}>
      {children}
    </AccentColourContext.Provider>
  );
}

export function useAccentColour(): AccentColourContextValue {
  const ctx = useContext(AccentColourContext);
  if (!ctx) {
    throw new Error(
      "useAccentColour must be used inside <AccentColourProvider>"
    );
  }
  return ctx;
}
