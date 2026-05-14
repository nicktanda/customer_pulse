"use client";

/**
 * Reads the stored accent colour from localStorage on first render and
 * applies it to the document root before the rest of the UI paints.
 * Mount this high in the component tree (e.g. the root layout) so the
 * correct CSS variables are set before any visible element renders.
 */
import { useEffect } from "react";
import {
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT_ID,
  applyAccentColour,
  getAccentById,
} from "@/lib/accent-colour";

export function AccentColourInit() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
      applyAccentColour(getAccentById(stored ?? DEFAULT_ACCENT_ID));
    } catch {
      applyAccentColour(getAccentById(DEFAULT_ACCENT_ID));
    }
  }, []);

  return null;
}
