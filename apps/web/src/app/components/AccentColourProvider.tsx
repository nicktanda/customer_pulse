"use client";

import { useEffect } from "react";
import "../accent-colour.css";

export const ACCENT_PALETTE = [
  { id: "indigo",  label: "Indigo",  hex: "#6366f1", rgb: "99, 102, 241" },
  { id: "blue",   label: "Blue",   hex: "#3b82f6", rgb: "59, 130, 246" },
  { id: "violet", label: "Violet", hex: "#8b5cf6", rgb: "139, 92, 246" },
  { id: "rose",   label: "Rose",   hex: "#f43f5e", rgb: "244, 63, 94" },
  { id: "orange", label: "Orange", hex: "#f97316", rgb: "249, 115, 22" },
  { id: "green",  label: "Green",  hex: "#22c55e", rgb: "34, 197, 94" },
  { id: "teal",   label: "Teal",   hex: "#14b8a6", rgb: "20, 184, 166" },
  { id: "sky",    label: "Sky",    hex: "#0ea5e9", rgb: "14, 165, 233" },
] as const;

export type AccentId = typeof ACCENT_PALETTE[number]["id"];

export const DEFAULT_ACCENT: AccentId = "indigo";
export const STORAGE_KEY = "xenoform_accent_colour";

export function getAccentById(id: string) {
  return ACCENT_PALETTE.find((p) => p.id === id) ?? ACCENT_PALETTE[0];
}

interface AccentColourProviderProps {
  accentId?: string | null;
}

export default function AccentColourProvider({ accentId }: AccentColourProviderProps) {
  useEffect(() => {
    const id = accentId ?? localStorage.getItem(STORAGE_KEY) ?? DEFAULT_ACCENT;
    const accent = getAccentById(id);
    const root = document.documentElement;
    root.setAttribute("data-accent", accent.id);
    root.style.setProperty("--accent-colour", accent.hex);
    root.style.setProperty("--accent-colour-rgb", accent.rgb);
  }, [accentId]);

  return null;
}
