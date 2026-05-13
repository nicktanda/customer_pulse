"use client";

import { useEffect } from "react";
import { initAccentColour } from "./AccentColourPicker";

/**
 * Reads the stored accent colour from localStorage on first render and
 * applies it to the document root so there is no flash of the default colour.
 * Mount this once near the top of the component tree (e.g. in the root layout).
 *
 * Note: because this uses useEffect it fires after first paint. For a
 * zero-flash solution a synchronous inline <script> in <head> would be
 * required. The current approach is acceptable for the initial release —
 * the flash is a single-frame flicker to the default indigo colour.
 */
export function AccentColourInitializer() {
  useEffect(() => {
    initAccentColour();
  }, []);

  return null;
}
