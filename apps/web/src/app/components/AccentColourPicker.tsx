"use client";

import { useState, useEffect } from "react";

export const ACCENT_COLOURS = [
  { name: "Indigo", value: "#4F46E5", label: "indigo" },
  { name: "Violet", value: "#7C3AED", label: "violet" },
  { name: "Rose", value: "#E11D48", label: "rose" },
  { name: "Orange", value: "#EA580C", label: "orange" },
  { name: "Emerald", value: "#059669", label: "emerald" },
  { name: "Teal", value: "#0D9488", label: "teal" },
  { name: "Sky", value: "#0284C7", label: "sky" },
  { name: "Amber", value: "#D97706", label: "amber" },
] as const;

export type AccentColourLabel = (typeof ACCENT_COLOURS)[number]["label"];

export const DEFAULT_ACCENT: AccentColourLabel = "indigo";
export const ACCENT_STORAGE_KEY = "user_accent_colour";

interface AccentColourPickerProps {
  value?: AccentColourLabel;
  onChange?: (label: AccentColourLabel) => void;
}

export function AccentColourPicker({ value, onChange }: AccentColourPickerProps) {
  const [selected, setSelected] = useState<AccentColourLabel>(value ?? DEFAULT_ACCENT);

  useEffect(() => {
    if (value) setSelected(value);
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
}

export function initAccentColour() {
  if (typeof window === "undefined") return;
  const stored = localStorage.getItem(ACCENT_STORAGE_KEY) as AccentColourLabel | null;
  const label: AccentColourLabel =
    stored && ACCENT_COLOURS.some((c) => c.label === stored) ? stored : DEFAULT_ACCENT;
  applyAccentColour(label);
}
