"use client";

import React, { useEffect, useState, useCallback } from "react";

export const ACCENT_SWATCHES = [
  { id: "indigo", label: "Indigo", value: "#6366f1" },
  { id: "violet", label: "Violet", value: "#7c3aed" },
  { id: "sky", label: "Sky", value: "#0284c7" },
  { id: "teal", label: "Teal", value: "#0f766e" },
  { id: "emerald", label: "Emerald", value: "#059669" },
  { id: "amber", label: "Amber", value: "#b45309" },
  { id: "rose", label: "Rose", value: "#e11d48" },
  { id: "fuchsia", label: "Fuchsia", value: "#a21caf" },
] as const;

export type AccentSwatchId = (typeof ACCENT_SWATCHES)[number]["id"];

const STORAGE_KEY = "accent_color_id";
const DEFAULT_ACCENT: AccentSwatchId = "indigo";
const CSS_VAR = "--accent";

export function applyAccentColor(id: AccentSwatchId) {
  const swatch = ACCENT_SWATCHES.find((s) => s.id === id);
  if (!swatch) return;
  document.documentElement.style.setProperty(CSS_VAR, swatch.value);
}

export function loadStoredAccent(): AccentSwatchId {
  if (typeof window === "undefined") return DEFAULT_ACCENT;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && ACCENT_SWATCHES.some((s) => s.id === stored)) {
    return stored as AccentSwatchId;
  }
  return DEFAULT_ACCENT;
}

interface AccentColorPickerProps {
  /** Called after the user selects and saves an accent. */
  onSave?: (id: AccentSwatchId) => void;
}

export default function AccentColorPicker({ onSave }: AccentColorPickerProps) {
  const [selected, setSelected] = useState<AccentSwatchId>(DEFAULT_ACCENT);
  const [preview, setPreview] = useState<AccentSwatchId>(DEFAULT_ACCENT);
  const [saved, setSaved] = useState(false);

  // Load stored preference on mount
  useEffect(() => {
    const stored = loadStoredAccent();
    setSelected(stored);
    setPreview(stored);
    applyAccentColor(stored);
  }, []);

  const handleHover = useCallback((id: AccentSwatchId) => {
    setPreview(id);
  }, []);

  const handleHoverEnd = useCallback(() => {
    setPreview(selected);
  }, [selected]);

  const handleSelect = useCallback((id: AccentSwatchId) => {
    setSelected(id);
    setPreview(id);
    setSaved(false);
  }, []);

  const handleSave = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, selected);
    applyAccentColor(selected);
    setSaved(true);
    onSave?.(selected);
    // Track swatch selection for analytics
    if (typeof window !== "undefined" && (window as any).analytics) {
      (window as any).analytics.track("accent_color_selected", { accent: selected });
    }
  }, [selected, onSave]);

  const previewSwatch = ACCENT_SWATCHES.find((s) => s.id === preview)!;

  return (
    <div className="accent-color-picker">
      <p className="accent-color-picker__description">
        Choose an accent colour. It will be applied to buttons, links, and focus
        indicators across the app.
      </p>

      {/* Swatch grid */}
      <div
        className="accent-color-picker__swatches"
        role="radiogroup"
        aria-label="Accent colour"
      >
        {ACCENT_SWATCHES.map((swatch) => (
          <button
            key={swatch.id}
            type="button"
            role="radio"
            aria-checked={selected === swatch.id}
            aria-label={swatch.label}
            title={swatch.label}
            className={[
              "accent-color-picker__swatch",
              selected === swatch.id
                ? "accent-color-picker__swatch--active"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ backgroundColor: swatch.value }}
            onClick={() => handleSelect(swatch.id)}
            onMouseEnter={() => handleHover(swatch.id)}
            onMouseLeave={handleHoverEnd}
            onFocus={() => handleHover(swatch.id)}
            onBlur={handleHoverEnd}
          />
        ))}
      </div>

      {/* Live preview */}
      <div
        className="accent-color-picker__preview"
        style={{
          // Scope the preview CSS variable to this element only
          ["--preview-accent" as string]: previewSwatch.value,
        }}
      >
        <span className="accent-color-picker__preview-label">
          Preview – {previewSwatch.label}
        </span>
        <div className="accent-color-picker__preview-ui">
          <button
            type="button"
            className="accent-color-picker__preview-btn"
            tabIndex={-1}
          >
            Save changes
          </button>
          <a
            href="#"
            className="accent-color-picker__preview-link"
            tabIndex={-1}
            onClick={(e) => e.preventDefault()}
          >
            Learn more
          </a>
          <span className="accent-color-picker__preview-badge">Active</span>
        </div>
      </div>

      {/* Save button */}
      <button
        type="button"
        className="accent-color-picker__save"
        onClick={handleSave}
      >
        {saved ? "Saved ✓" : "Apply accent colour"}
      </button>
    </div>
  );
}
