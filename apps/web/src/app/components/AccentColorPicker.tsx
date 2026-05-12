"use client";

import { useState, useCallback } from "react";
import { useAccentColor } from "./AccentColorProvider";

const CURATED_PALETTE = [
  { label: "Indigo", value: "#6366f1" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Sky", value: "#0ea5e9" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Emerald", value: "#10b981" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Orange", value: "#f97316" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Fuchsia", value: "#d946ef" },
  { label: "Slate", value: "#475569" },
];

const DEFAULT_ACCENT = "#6366f1";

/**
 * Calculate relative luminance for a hex colour.
 */
function hexToLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const linearise = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/**
 * Calculate WCAG contrast ratio between two hex colours.
 */
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = hexToLuminance(hex1);
  const l2 = hexToLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check WCAG AA compliance against white (#ffffff) background.
 */
function meetsWcagAA(hex: string): boolean {
  return contrastRatio(hex, "#ffffff") >= 4.5;
}

export function AccentColorPicker() {
  const { accentColor, setAccentColor } = useAccentColor();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tempCustomColor, setTempCustomColor] = useState(accentColor);

  const handlePaletteSelect = useCallback(
    (color: string) => {
      setAccentColor(color);
      setTempCustomColor(color);
    },
    [setAccentColor]
  );

  const handleCustomColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const color = e.target.value;
      setTempCustomColor(color);
      setAccentColor(color);
    },
    [setAccentColor]
  );

  const handleReset = useCallback(() => {
    setAccentColor(DEFAULT_ACCENT);
    setTempCustomColor(DEFAULT_ACCENT);
  }, [setAccentColor]);

  const wcagPass = meetsWcagAA(accentColor);
  const contrastValue = contrastRatio(accentColor, "#ffffff").toFixed(2);

  return (
    <div className="accent-color-picker">
      <div className="accent-color-picker__header">
        <h3 className="accent-color-picker__title">Accent Color</h3>
        <p className="accent-color-picker__description">
          Personalise highlights, buttons, and active states across the app.
        </p>
      </div>

      <div className="accent-color-picker__preview">
        <div
          className="accent-color-picker__preview-swatch"
          style={{ backgroundColor: accentColor }}
          aria-label={`Current accent colour: ${accentColor}`}
        />
        <span className="accent-color-picker__preview-hex">{accentColor}</span>
        {!wcagPass && (
          <span className="accent-color-picker__wcag-warning" role="alert">
            ⚠ Low contrast ({contrastValue}:1). May be hard to read on light
            backgrounds.
          </span>
        )}
        {wcagPass && (
          <span className="accent-color-picker__wcag-pass">
            ✓ Contrast {contrastValue}:1 – WCAG AA
          </span>
        )}
      </div>

      <div
        className="accent-color-picker__palette"
        role="radiogroup"
        aria-label="Colour palette"
      >
        {CURATED_PALETTE.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={accentColor === value}
            aria-label={label}
            title={label}
            className={`accent-color-picker__swatch${
              accentColor === value
                ? " accent-color-picker__swatch--active"
                : ""
            }`}
            style={{ backgroundColor: value }}
            onClick={() => handlePaletteSelect(value)}
          />
        ))}
      </div>

      <div className="accent-color-picker__advanced">
        <button
          type="button"
          className="accent-color-picker__advanced-toggle"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
        >
          {showAdvanced ? "Hide" : "Show"} custom colour picker
        </button>

        {showAdvanced && (
          <div className="accent-color-picker__custom">
            <label
              htmlFor="accent-custom-input"
              className="accent-color-picker__custom-label"
            >
              Custom colour
            </label>
            <input
              id="accent-custom-input"
              type="color"
              value={tempCustomColor}
              onChange={handleCustomColorChange}
              className="accent-color-picker__custom-input"
            />
          </div>
        )}
      </div>

      <button
        type="button"
        className="accent-color-picker__reset"
        onClick={handleReset}
      >
        Reset to default
      </button>
    </div>
  );
}
