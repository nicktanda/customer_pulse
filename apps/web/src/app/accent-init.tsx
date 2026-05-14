"use client";

/**
 * Tiny script that runs before first paint to avoid a flash of the default accent.
 * Reads localStorage and sets --accent-colour on <html> synchronously.
 */
import { useEffect } from "react";
import { ACCENT_COLOURS, DEFAULT_ACCENT_KEY, type AccentColourKey } from "@/components/ui/accentColours";

export function AccentInit() {
  useEffect(() => {
    // This effect runs after hydration, but the inline <script> in layout handles pre-hydration.
  }, []);

  return null;
}

/**
 * Returns an inline script string that can be injected into <head> to set
 * accent CSS variables before React hydrates (prevents FOUC).
 */
export function getAccentInitScript(): string {
  const colours = JSON.stringify(ACCENT_COLOURS);
  const defaultKey = DEFAULT_ACCENT_KEY;
  return `
(function(){
  try {
    var colours = ${colours};
    var key = localStorage.getItem('accentColour') || '${defaultKey}';
    if (!colours[key]) key = '${defaultKey}';
    var c = colours[key];
    var r = document.documentElement;
    r.setAttribute('data-accent', key);
    r.style.setProperty('--accent-colour', c.value);
    r.style.setProperty('--accent-colour-hover', c.hover);
    r.style.setProperty('--accent-colour-subtle', c.subtle);
    r.style.setProperty('--accent-colour-foreground', c.foreground);
  } catch(e) {}
})();
  `.trim();
}
