/**
 * AccentColorInit
 *
 * Drop this component inside the root layout (or _app) so the
 * accent CSS custom property is restored from localStorage before
 * the first paint – avoiding a flash of the default colour.
 *
 * Usage in your root layout:
 *   import AccentColorInit from "@/components/AccentColorInit";
 *   // Inside <head> or early in <body>:
 *   <AccentColorInit />
 */
"use client";

import { useEffect } from "react";
import { loadStoredAccent, applyAccentColor } from "./AccentColorPicker";

export default function AccentColorInit() {
  useEffect(() => {
    const id = loadStoredAccent();
    applyAccentColor(id);
  }, []);

  return null;
}
