"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type AccentColour =
  | "indigo"
  | "violet"
  | "sky"
  | "teal"
  | "emerald"
  | "amber"
  | "rose"
  | "slate";

export interface AccentPaletteEntry {
  id: AccentColour;
  label: string;
  /** Tailwind / hex swatch for the picker UI */
  swatch: string;
  /** WCAG contrast notes */
  a11y: string;
}

export const ACCENT_PALETTE: AccentPaletteEntry[] = [
  { id: "indigo",  label: "Indigo",  swatch: "#6366f1", a11y: "AA on white" },
  { id: "violet",  label: "Violet",  swatch: "#7c3aed", a11y: "AA on white" },
  { id: "sky",     label: "Sky",     swatch: "#0284c7", a11y: "AA on white" },
  { id: "teal",    label: "Teal",    swatch: "#0d9488", a11y: "AA on white" },
  { id: "emerald", label: "Emerald", swatch: "#059669", a11y: "AA on white" },
  { id: "amber",   label: "Amber",   swatch: "#d97706", a11y: "AA on white" },
  { id: "rose",    label: "Rose",    swatch: "#e11d48", a11y: "AA on white" },
  { id: "slate",   label: "Slate",   swatch: "#475569", a11y: "AA on white" },
];

const STORAGE_KEY = "accentColour";
const DEFAULT_ACCENT: AccentColour = "indigo";

interface AccentColourContextValue {
  accent: AccentColour;
  setAccent: (colour: AccentColour) => void;
}

const AccentColourContext = createContext<AccentColourContextValue>({
  accent: DEFAULT_ACCENT,
  setAccent: () => undefined,
});

export function useAccentColour(): AccentColourContextValue {
  return useContext(AccentColourContext);
}

function isAccentColour(value: unknown): value is AccentColour {
  return ACCENT_PALETTE.some((p) => p.id === value);
}

function applyAccent(colour: AccentColour): void {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-accent", colour);
  }
}

export default function AccentColourProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [accent, setAccentState] = useState<AccentColour>(DEFAULT_ACCENT);

  /* Initialise from localStorage on mount (client-only) */
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const resolved = isAccentColour(stored) ? stored : DEFAULT_ACCENT;
    setAccentState(resolved);
    applyAccent(resolved);
  }, []);

  const setAccent = useCallback((colour: AccentColour) => {
    setAccentState(colour);
    applyAccent(colour);
    try {
      localStorage.setItem(STORAGE_KEY, colour);
    } catch {
      /* storage may be unavailable in private-browsing edge cases */
    }
  }, []);

  return (
    <AccentColourContext.Provider value={{ accent, setAccent }}>
      {children}
    </AccentColourContext.Provider>
  );
}
