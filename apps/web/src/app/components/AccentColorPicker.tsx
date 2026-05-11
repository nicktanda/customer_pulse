"use client";

import React, { useState, useCallback } from "react";

const CURATED_PALETTE = [
  { name: "Indigo", value: "#4F46E5" },
  { name: "Violet", value: "#7C3AED" },
  { name: "Sky", value: "#0284C7" },
  { name: "Teal", value: "#0D9488" },
  { name: "Emerald", value: "#059669" },
  { name: "Amber", value: "#D97706" },
  { name: "Rose", value: "#E11D48" },
  { name: "Pink", value: "#DB2777" },
  { name: "Slate", value: "#475569" },
  { name: "Orange", value: "#EA580C" },
];

const DEFAULT_ACCENT = "#4F46E5";

/**
 * Computes relative luminance for a hex colour.
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function relativeLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const linearise = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/**
 * Returns the WCAG contrast ratio between two hex colours.
 */
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns true if the colour passes WCAG AA (4.5:1) against white (#ffffff).
 */
function passesWCAG_AA(hex: string): boolean {
  return contrastRatio(hex, "#ffffff") >= 4.5;
}

function isValidHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

export interface AccentColorPickerProps {
  currentColor?: string;
  onColorChange: (color: string) => void;
  disabled?: boolean;
}

export function AccentColorPicker({
  currentColor = DEFAULT_ACCENT,
  onColorChange,
  disabled = false,
}: AccentColorPickerProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [freePickValue, setFreePickValue] = useState(currentColor);
  const [freePickInput, setFreePickInput] = useState(currentColor);

  const handlePaletteSelect = useCallback(
    (color: string) => {
      setFreePickValue(color);
      setFreePickInput(color);
      onColorChange(color);
    },
    [onColorChange]
  );

  const handleFreePickChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setFreePickValue(val);
      setFreePickInput(val);
      if (isValidHex(val)) {
        onColorChange(val);
      }
    },
    [onColorChange]
  );

  const handleFreePickTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setFreePickInput(val);
      if (isValidHex(val)) {
        setFreePickValue(val);
        onColorChange(val);
      }
    },
    [onColorChange]
  );

  const activeColor = isValidHex(currentColor) ? currentColor : DEFAULT_ACCENT;
  const contrastOk = passesWCAG_AA(activeColor);
  const contrastValue = contrastRatio(activeColor, "#ffffff").toFixed(2);

  return (
    <div className="accent-color-picker">
      <div className="accent-color-picker__palette">
        {CURATED_PALETTE.map((swatch) => (
          <button
            key={swatch.value}
            type="button"
            className={`accent-color-picker__swatch${
              activeColor.toLowerCase() === swatch.value.toLowerCase()
                ? " accent-color-picker__swatch--active"
                : ""
            }`}
            style={{ backgroundColor: swatch.value }}
            title={swatch.name}
            aria-label={`Select ${swatch.name} accent colour`}
            aria-pressed={activeColor.toLowerCase() === swatch.value.toLowerCase()}
            onClick={() => handlePaletteSelect(swatch.value)}
            disabled={disabled}
          />
        ))}
      </div>

      <button
        type="button"
        className="accent-color-picker__advanced-toggle"
        onClick={() => setShowAdvanced((v) => !v)}
        disabled={disabled}
      >
        {showAdvanced ? "Hide advanced" : "Custom colour…"}
      </button>

      {showAdvanced && (
        <div className="accent-color-picker__advanced">
          <input
            type="color"
            value={freePickValue}
            onChange={handleFreePickChange}
            disabled={disabled}
            aria-label="Custom accent colour picker"
            className="accent-color-picker__color-input"
          />
          <input
            type="text"
            value={freePickInput}
            onChange={handleFreePickTextChange}
            maxLength={7}
            placeholder="#4F46E5"
            disabled={disabled}
            aria-label="Custom accent colour hex value"
            className="accent-color-picker__hex-input"
          />
        </div>
      )}

      {!contrastOk && (
        <p className="accent-color-picker__warning" role="alert">
          ⚠️ This colour has a contrast ratio of {contrastValue}:1 against white,
          which may fail WCAG AA accessibility guidelines (minimum 4.5:1). Consider
          choosing a darker shade.
        </p>
      )}
    </div>
  );
}
