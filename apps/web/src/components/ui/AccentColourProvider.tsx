"use client";

import { useEffect } from "react";
import { ACCENT_COLOURS, DEFAULT_ACCENT_KEY, type AccentColourKey } from "./accentColours";

interface AccentColourProviderProps {
  children: React.ReactNode;
  initialAccent?: string;
}

/**
 * Reads accent colour from localStorage (or a server-provided initial value),
 * sets it on <html data-accent="..."> and the --accent-colour CSS variable.
 * This runs on the client after hydration.
 */
export function AccentColourProvider({ children, initialAccent }: AccentColourProviderProps) {
  useEffect(() => {
    const stored = (typeof window !== "undefined" ? localStorage.getItem("accentColour") : null) ?? initialAccent ?? DEFAULT_ACCENT_KEY;
    const key = Object.prototype.hasOwnProperty.call(ACCENT_COLOURS, stored) ? stored as AccentColourKey : DEFAULT_ACCENT_KEY;
    applyAccent(key);
  }, [initialAccent]);

  return <>{children}</>;
}

export function applyAccent(key: AccentColourKey) {
  const colour = ACCENT_COLOURS[key];
  if (!colour) return;
  document.documentElement.setAttribute("data-accent", key);
  document.documentElement.style.setProperty("--accent-colour", colour.value);
  document.documentElement.style.setProperty("--accent-colour-hover", colour.hover);
  document.documentElement.style.setProperty("--accent-colour-subtle", colour.subtle);
  document.documentElement.style.setProperty("--accent-colour-foreground", colour.foreground);
  localStorage.setItem("accentColour", key);
}
