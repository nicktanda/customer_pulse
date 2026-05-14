"use client";

import { useEffect } from "react";
import { ACCENT_COLOURS, AccentColourId } from "../lib/useAccentColour";

const STORAGE_KEY = "xeno_accent_colour";
const DEFAULT_ACCENT: AccentColourId = "indigo";

/**
 * Mounted once in the app shell. On first render it reads localStorage
 * and immediately applies the accent colour to <html> so every page
 * (including non-settings pages) reflects the user's preference.
 */
export default function AccentColourProvider() {
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as AccentColourId | null;
    const id: AccentColourId = stored ?? DEFAULT_ACCENT;
    const colour = ACCENT_COLOURS.find((c) => c.id === id);
    if (!colour) return;
    const root = document.documentElement;
    root.setAttribute("data-accent", id);
    root.style.setProperty("--accent-colour", colour.value);
  }, []);

  return null;
}
