"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  AccentColour,
  DEFAULT_ACCENT_ID,
  applyAccentToDOM,
  getAccentById,
  loadAccentId,
  saveAccentId,
} from "@/lib/accentColour";
import "@/app/accent-colour.css";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface AccentColourContextValue {
  accent: AccentColour;
  setAccentById: (id: string) => void;
}

const AccentColourContext = createContext<AccentColourContextValue>({
  accent: getAccentById(DEFAULT_ACCENT_ID),
  setAccentById: () => undefined,
});

export function useAccentColour(): AccentColourContextValue {
  return useContext(AccentColourContext);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AccentColourProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccent] = useState<AccentColour>(() =>
    getAccentById(DEFAULT_ACCENT_ID)
  );

  // Hydrate from localStorage on mount (client-only).
  useEffect(() => {
    const saved = loadAccentId();
    const colour = getAccentById(saved);
    setAccent(colour);
    applyAccentToDOM(colour);
  }, []);

  const setAccentById = useCallback((id: string) => {
    const colour = getAccentById(id);
    setAccent(colour);
    saveAccentId(id);
    applyAccentToDOM(colour);
  }, []);

  return (
    <AccentColourContext.Provider value={{ accent, setAccentById }}>
      {children}
    </AccentColourContext.Provider>
  );
}
