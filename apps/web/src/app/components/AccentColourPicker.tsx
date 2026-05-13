"use client";

import { useState, useEffect } from "react";

export const ACCENT_COLOURS = [
  { name: "Indigo", value: "#4F46E5", label: "indigo", foreground: "#ffffff" },
  { name: "Violet", value: "#7C3AED", label: "violet", foreground: "#ffffff" },
  { name: "Rose", value: "#E11D48", label: "rose", foreground: "#ffffff" },
  { name: "Orange", value: "#EA580C", label: "orange", foreground: "#ffffff" },
  { name: "Emerald", value: "#059669", label: "emerald", foreground: "#ffffff" },
  { name: "Teal", value: "#0D9488", label: "teal", foreground: "#ffffff" },
  { name: "Sky", value: "#0284C7", label: "sky", foreground: "#ffffff" },
  // NOTE: Amber (#D97706) has insufficient contrast against white (#ffffff).
  // Using dark foreground (#1a1a1a) to maintain WCAG AA compliance.
  { name: "Amber", value: "#D97706", label: "amber", foreground: "#1a1a1a" },
] as const;

export type AccentColourLabel = (typeof ACCENT_COLOURS)[number]["label"];

export const DEFAULT_ACCENT: AccentColourLabel = "indigo";
export const ACCENT_STORAGE_KEY = "user_accent_colour";

/**
 * Returns the stored accent colour from localStorage, falling back to the
 * default if the stored value is absent or unrecognised.
 */
export function getStoredAccentColour(): AccentColourLabel {
  if (typeof window === "undefined") return DEFAULT_ACCENT;
  const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
  if (stored && ACCENT_COLOURS.some((c) => c.label === stored)) {
    return stored as AccentColourLabel;
  }
  return DEFAULT_ACCENT;
}

interface AccentColourPickerProps {
  value?: AccentColourLabel;
  onChange?: (label: AccentColourLabel) => void;
}

export function AccentColourPicker({ value, onChange }: AccentColourPickerProps) {
  const [selected, setSelected] = useState<AccentColourLabel>(value ?? DEFAULT_ACCENT);

  useEffect(() => {
    if (value !== undefined) {
      setSelected(value);
    } else {
      setSelected(DEFAULT_ACCENT);
    }
  }, [value]);

  function handleSelect(label: AccentColourLabel) {
    setSelected(label);
    applyAccentColour(label);
    localStorage.setItem(ACCENT_STORAGE_KEY, label);
    onChange?.(label);
  }

  return (
    <div>
      <p className="accent-picker__label">Accent Colour</p>
      <div className="accent-picker__swatches" role="radiogroup" aria-label="Accent colour">
        {ACCENT_COLOURS.map((colour) => (
          <button
            key={colour.label}
            type="button"
            role="radio"
            aria-checked={selected === colour.label}
            aria-label={colour.name}
            title={colour.name}
            tabIndex={selected === colour.label ? 0 : -1}
            className={[
              "accent-picker__swatch",
              selected === colour.label ? "accent-picker__swatch--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ backgroundColor: colour.value }}
            onClick={() => handleSelect(colour.label)}
          />
        ))}
      </div>
    </div>
  );
}

export function applyAccentColour(label: AccentColourLabel) {
  const colour = ACCENT_COLOURS.find((c) => c.label === label);
  if (!colour) return;
  const root = document.documentElement;
  root.setAttribute("data-accent", label);
  root.style.setProperty("--colour-accent", colour.value);
  root.style.setProperty("--colour-accent-foreground", colour.foreground);
}

export function initAccentColour() {
  if (typeof window === "undefined") return;
  const label = getStoredAccentColour();
  applyAccentColour(label);
}
