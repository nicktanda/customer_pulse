"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ACCENT_COLOURS,
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT_ID,
  applyAccentColour,
  getAccentById,
  type AccentColour,
} from "@/lib/accent-colour";

export function useAccentColour() {
  const [accentId, setAccentIdState] = useState<string>(DEFAULT_ACCENT_ID);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
      if (stored) {
        setAccentIdState(stored);
        applyAccentColour(getAccentById(stored));
      } else {
        applyAccentColour(getAccentById(DEFAULT_ACCENT_ID));
      }
    } catch {
      applyAccentColour(getAccentById(DEFAULT_ACCENT_ID));
    }
  }, []);

  const setAccentId = useCallback((id: string) => {
    const accent = getAccentById(id);
    setAccentIdState(accent.id);
    applyAccentColour(accent);
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, accent.id);
    } catch {
      // localStorage unavailable — in-memory only
    }
  }, []);

  const currentAccent: AccentColour = getAccentById(accentId);

  return {
    accentId,
    currentAccent,
    setAccentId,
    colours: ACCENT_COLOURS,
  };
}
