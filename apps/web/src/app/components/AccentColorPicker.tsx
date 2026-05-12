"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccentColor, DEFAULT_ACCENT } from "./AccentColorProvider";
import { isValidHex, meetsWcagAA, contrastRatio } from "../utils/color";

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

/**
 * The app uses a dark theme (`data-bs-theme="dark"`).
 * WCAG contrast is checked against this background colour rather than white
 * to avoid misleading pass/fail results for dark-mode users.
 *
 * TODO: make this dynamic if the app ever supports light mode.
 */
const DARK_BG = "#1a1a2e";

export function AccentColorPicker() {
  const { accentColor, setAccentColor } = useAccentColor();
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Keep tempCustomColor in sync with the context colour (handles external changes)
  const [tempCustomColor, setTempCustomColor] = useState(accentColor);

  useEffect(() => {
    setTempCustomColor(accentColor);
  }, [accentColor]);

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
      // Only apply if it's a valid complete hex (native color input always
      // returns #rrggbb, but guard anyway for programmatic changes).
      if (isValidHex(color)) {
        setAccentColor(color);
      }
    },
    [setAccentColor]
  );

  const handleReset = useCallback(() => {
    setAccentColor(DEFAULT_ACCENT);
    setTempCustomColor(DEFAULT_ACCENT);
  }, [setAccentColor]);

  const validColor = isValidHex(accentColor);
  const wcagPass = validColor && meetsWcagAA(accentColor, DARK_BG);
  const contrastValue = validColor
    ? contrastRatio(accentColor, DARK_BG).toFixed(2)
    : "N/A";

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
        <span
          className={
            !validColor || !wcagPass
              ? "accent-color-picker__wcag-warning"
              : "accent-color-picker__wcag-pass"
          }
          role="status"
          aria-live="polite"
        >
          {!validColor
            ? "⚠ Invalid colour value."
            : !wcagPass
            ? `⚠ Low contrast (${contrastValue}:1) on dark background. May be hard to read.`
            : `✓ Contrast ${contrastValue}:1 – WCAG AA (dark bg)`}
        </span>
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
