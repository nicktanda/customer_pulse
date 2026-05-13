"use client";

import { useEffect } from "react";
import { initAccentColour } from "./AccentColourPicker";

/**
 * Reads the stored accent colour from localStorage on first render and
 * applies it to the document root so there is no flash of the default colour.
 * Mount this once near the top of the component tree (e.g. in the root layout).
 */
export function AccentColourInitializer() {
  useEffect(() => {
    initAccentColour();
  }, []);

  return null;
}
