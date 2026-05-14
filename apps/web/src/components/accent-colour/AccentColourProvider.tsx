"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export const ACCENT_COLOURS = [
  { id: "indigo", label: "Indigo", value: "#4f46e5", dark: "#6366f1" },
  { id: "blue", label: "Blue", value: "#2563eb", dark: "#3b82f6" },
  { id: "teal", label: "Teal", value: "#0d9488", dark: "#14b8a6" },
  { id: "green", label: "Green", value: "#16a34a", dark: "#22c55e" },
  { id: "violet", label: "Violet", value: "#7c3aed", dark: "#8b5cf6" },
  { id: "rose", label: "Rose", value: "#e11d48", dark: "#f43f5e" },
  { id: "orange", label: "Orange", value: "#ea580c", dark: "#f97316" },
  { id: "slate", label: "Slate", value: "#475569", dark: "#64748b" },
] as const;

export type AccentColourId = (typeof ACCENT_COLOURS)[number]["id"];

export const DEFAULT_ACCENT: AccentColourId = "indigo";
const STORAGE_KEY = "xeno_accent_colour";

interface AccentColourContextValue {
  accentId: AccentColourId;
  setAccentId: (id: AccentColourId) => void;
}

const AccentColourContext = createContext<AccentColourContextValue>({
  accentId: DEFAULT_ACCENT,
  setAccentId: () => {},
});

export function useAccentColour() {
  return useContext(AccentColourContext);
}

function applyAccent(id: AccentColourId) {
  const colour = ACCENT_COLOURS.find((c) => c.id === id);
  if (!colour) return;

  const root = document.documentElement;
  const isDark =
    root.getAttribute("data-bs-theme") === "dark" ||
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const resolved = isDark ? colour.dark : colour.value;

  root.setAttribute("data-accent", id);
  root.style.setProperty("--accent", resolved);
  root.style.setProperty("--accent-dark", colour.dark);
  root.style.setProperty("--accent-light", colour.value);

  // Alias Bootstrap primary variables so existing buttons/links respond
  root.style.setProperty("--bs-primary", resolved);
  root.style.setProperty("--bs-primary-rgb", hexToRgbComponents(resolved));
  root.style.setProperty("--bs-link-color", resolved);
  root.style.setProperty("--bs-link-hover-color", shiftLightness(resolved, -12));
  root.style.setProperty("--bs-focus-ring-color", `${resolved}40`);
}

function hexToRgbComponents(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

/** Naive lightness shift by adjusting hex brightness */
function shiftLightness(hex: string, delta: number): string {
  const clean = hex.replace("#", "");
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(parseInt(clean.slice(0, 2), 16) + delta);
  const g = clamp(parseInt(clean.slice(2, 4), 16) + delta);
  const b = clamp(parseInt(clean.slice(4, 6), 16) + delta);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function AccentColourProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [accentId, setAccentIdState] = useState<AccentColourId>(DEFAULT_ACCENT);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as AccentColourId | null;
      if (stored && ACCENT_COLOURS.some((c) => c.id === stored)) {
        setAccentIdState(stored);
        applyAccent(stored);
        return;
      }
    } catch {
      // localStorage unavailable
    }
    applyAccent(DEFAULT_ACCENT);
  }, []);

  // Re-apply when theme changes (dark/light)
  useEffect(() => {
    const observer = new MutationObserver(() => applyAccent(accentId));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-bs-theme"],
    });
    return () => observer.disconnect();
  }, [accentId]);

  const setAccentId = (id: AccentColourId) => {
    setAccentIdState(id);
    applyAccent(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // localStorage unavailable
    }
  };

  return (
    <AccentColourContext.Provider value={{ accentId, setAccentId }}>
      {children}
    </AccentColourContext.Provider>
  );
}
