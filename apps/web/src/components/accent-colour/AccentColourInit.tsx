"use client";

/**
 * Reads the stored accent colour from localStorage on first render and
 * applies it to the document root before the rest of the UI paints.
 * Also imports the accent-colour CSS so the variables cascade everywhere.
 * Mount this high in the component tree (e.g. the root layout).
 */
import { useLayoutEffect } from "react";
import "@/app/accent-colour.css";
import {
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT_ID,
  applyAccentColour,
  getAccentById,
} from "@/lib/accent-colour";

export function AccentColourInit() {
  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
      applyAccentColour(getAccentById(stored ?? DEFAULT_ACCENT_ID));
    } catch {
      applyAccentColour(getAccentById(DEFAULT_ACCENT_ID));
    }
  }, []);

  return null;
}
