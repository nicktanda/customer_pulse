"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export const ACCENT_COLORS = [
  { id: "indigo", label: "Indigo", value: "#4F46E5" },
  { id: "violet", label: "Violet", value: "#7C3AED" },
  { id: "sky", label: "Sky", value: "#0284C7" },
  { id: "teal", label: "Teal", value: "#0D9488" },
  { id: "emerald", label: "Emerald", value: "#059669" },
  { id: "amber", label: "Amber", value: "#B45309" },
  { id: "rose", label: "Rose", value: "#BE185D" },
  { id: "slate", label: "Slate", value: "#475569" },
] as const;

export type AccentColorId = (typeof ACCENT_COLORS)[number]["id"];

const DEFAULT_ACCENT: AccentColorId = "indigo";
const STORAGE_KEY = "accent-color";

interface AccentColorContextValue {
  accentId: AccentColorId;
  setAccentId: (id: AccentColorId) => void;
}

const AccentColorContext = createContext<AccentColorContextValue | null>(null);

function applyAccentColor(id: AccentColorId): void {
  const color = ACCENT_COLORS.find((c) => c.id === id);
  if (color) {
    document.documentElement.style.setProperty("--accent", color.value);
    // Also wire up accent-color for native browser controls (checkboxes, radios, range, progress)
    document.documentElement.style.setProperty("accent-color", color.value);
  }
}

export function AccentColorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [accentId, setAccentIdState] = useState<AccentColorId>(DEFAULT_ACCENT);

  // Initialise from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as AccentColorId | null;
      const resolved =
        stored && ACCENT_COLORS.some((c) => c.id === stored)
          ? stored
          : DEFAULT_ACCENT;
      setAccentIdState(resolved);
      applyAccentColor(resolved);
    } catch {
      applyAccentColor(DEFAULT_ACCENT);
    }
  }, []);

  const setAccentId = useCallback((id: AccentColorId) => {
    setAccentIdState(id);
    applyAccentColor(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // storage unavailable — best-effort
    }
  }, []);

  return (
    <AccentColorContext.Provider value={{ accentId, setAccentId }}>
      {children}
    </AccentColorContext.Provider>
  );
}

export function useAccentColor(): AccentColorContextValue {
  const ctx = useContext(AccentColorContext);
  if (!ctx) {
    throw new Error("useAccentColor must be used within an AccentColorProvider");
  }
  return ctx;
}
