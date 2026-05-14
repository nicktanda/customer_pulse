/**
 * AccentColourInit
 * ----------------
 * Lightweight client component mounted once in the root layout.
 * On first render it reads the stored accent preference from localStorage
 * and immediately writes the CSS custom properties to <html>, eliminating
 * any flash of the default colour on page load.
 *
 * This is intentionally separate from AccentColourProvider (which lives
 * deeper in the tree) so that the CSS variables are available everywhere
 * including pages that don't render the settings panel.
 */
"use client";

import { useEffect } from "react";
import { applyAccentToDOM, getAccentById, loadAccentId } from "@/lib/accentColour";
import "@/app/accent-colour.css";

export function AccentColourInit() {
  useEffect(() => {
    const id = loadAccentId();
    applyAccentToDOM(getAccentById(id));
  }, []);

  // Renders nothing — only side-effects.
  return null;
}
