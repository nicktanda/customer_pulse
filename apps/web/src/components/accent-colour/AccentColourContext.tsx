"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AccentColourKey, DEFAULT_ACCENT, ACCENT_VALUES } from "./accent-palette";

const STORAGE_KEY = "xeno_accent_colour";

interface AccentColourContextValue {
  accent: AccentColourKey;
  setAccent: (key: AccentColourKey) => void;
}

const AccentColourContext = createContext<AccentColourContextValue>({
  accent: DEFAULT_ACCENT,
  setAccent: () => undefined,
});

export function AccentColourProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<AccentColourKey>(DEFAULT_ACCENT);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as AccentColourKey | null;
      if (stored && ACCENT_VALUES[stored]) {
        setAccentState(stored);
      }
    } catch {
      // localStorage not available (SSR guard)
    }
  }, []);

  // Apply accent to DOM whenever it changes
  useEffect(() => {
    const root = document.documentElement;
    const colour = ACCENT_VALUES[accent];
    root.setAttribute("data-accent", accent);
    root.style.setProperty("--accent", colour);
    root.style.setProperty("--accent-hover", shiftLightness(colour, -12));
    root.style.setProperty("--accent-subtle", hexToRgba(colour, 0.12));
    root.style.setProperty("--bs-primary", colour);
    root.style.setProperty("--bs-primary-rgb", hexToRgb(colour));
    root.style.setProperty("--bs-link-color", colour);
    root.style.setProperty("--bs-link-hover-color", shiftLightness(colour, -12));
    root.style.setProperty("--bs-btn-bg", colour);
    root.style.setProperty("--bs-btn-border-color", colour);
  }, [accent]);

  const setAccent = (key: AccentColourKey) => {
    setAccentState(key);
    try {
      localStorage.setItem(STORAGE_KEY, key);
    } catch {
      // ignore
    }
  };

  return (
    <AccentColourContext.Provider value={{ accent, setAccent }}>
      {children}
    </AccentColourContext.Provider>
  );
}

export function useAccentColour(): AccentColourContextValue {
  return useContext(AccentColourContext);
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function hexToRgba(hex: string, alpha: number): string {
  return `rgba(${hexToRgb(hex)},${alpha})`;
}

/** Naive lightness shift by adjusting each RGB channel proportionally. */
function shiftLightness(hex: string, amount: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(parseInt(hex.slice(1, 3), 16) + amount);
  const g = clamp(parseInt(hex.slice(3, 5), 16) + amount);
  const b = clamp(parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
