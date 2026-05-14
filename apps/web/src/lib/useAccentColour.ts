"use client";

import { useState, useEffect, useCallback } from "react";

export const ACCENT_COLOURS = [
  { id: "indigo",   label: "Indigo",   value: "#4f46e5" },
  { id: "violet",   label: "Violet",   value: "#7c3aed" },
  { id: "sky",      label: "Sky",      value: "#0284c7" },
  { id: "teal",     label: "Teal",     value: "#0d9488" },
  { id: "emerald",  label: "Emerald",  value: "#059669" },
  { id: "rose",     label: "Rose",     value: "#e11d48" },
  { id: "amber",    label: "Amber",    value: "#d97706" },
  { id: "slate",    label: "Slate",    value: "#475569" },
] as const;

export type AccentColourId = typeof ACCENT_COLOURS[number]["id"];

const STORAGE_KEY = "xeno_accent_colour";
const DEFAULT_ACCENT: AccentColourId = "indigo";
const ROOT_ATTR = "data-accent";

function applyAccent(id: AccentColourId) {
  const colour = ACCENT_COLOURS.find((c) => c.id === id);
  if (!colour) return;
  const root = document.documentElement;
  root.setAttribute(ROOT_ATTR, id);
  root.style.setProperty("--accent-colour", colour.value);
}

export function useAccentColour() {
  const [accent, setAccentState] = useState<AccentColourId>(DEFAULT_ACCENT);

  useEffect(() => {
    const stored = (typeof localStorage !== "undefined"
      ? localStorage.getItem(STORAGE_KEY)
      : null) as AccentColourId | null;
    const initial = stored ?? DEFAULT_ACCENT;
    setAccentState(initial);
    applyAccent(initial);
  }, []);

  const setAccent = useCallback((id: AccentColourId) => {
    setAccentState(id);
    localStorage.setItem(STORAGE_KEY, id);
    applyAccent(id);
  }, []);

  return { accent, setAccent, colours: ACCENT_COLOURS };
}
