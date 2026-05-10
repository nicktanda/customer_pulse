/**
 * AccentColorPicker
 *
 * A self-contained colour-picker component that renders:
 *  - A row of curated swatches
 *  - An HTML <input type="color"> for free colour selection
 *  - A WCAG contrast warning when the chosen colour is inaccessible
 *  - A reset-to-default link
 *
 * Usage:
 *   import { AccentColorPicker } from "@/components/AccentColorPicker";
 *   import "@/styles/accent-color-picker.css";
 *
 *   <AccentColorPicker
 *     value={accentColor}
 *     onChange={setAccentColor}
 *     onReset={reset}
 *     passesContrast={passesContrast}
 *   />
 */

"use client";

import React, { useId } from "react";
import { CURATED_PALETTE, DEFAULT_ACCENT } from "../hooks/useAccentColor";
import "../styles/accent-color-picker.css";

export interface AccentColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  onReset: () => void;
  passesContrast: boolean;
  className?: string;
}

export function AccentColorPicker({
  value,
  onChange,
  onReset,
  passesContrast,
  className = "",
}: AccentColorPickerProps) {
  const freePickId = useId();

  return (
    <div
      className={`accent-color-picker ${className}`}
      role="group"
      aria-label="Accent colour"
    >
      {/* Section label */}
      <p className="accent-color-picker__label">Accent colour</p>

      {/* Curated swatches */}
      <div
        className="accent-color-picker__swatches"
        role="radiogroup"
        aria-label="Colour swatches"
      >
        {CURATED_PALETTE.map(({ label, value: swatchValue }) => {
          const isSelected = value.toLowerCase() === swatchValue.toLowerCase();
          return (
            <button
              key={swatchValue}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={label}
              title={label}
              className={[
                "accent-color-picker__swatch",
                isSelected ? "accent-color-picker__swatch--selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ backgroundColor: swatchValue }}
              onClick={() => onChange(swatchValue)}
            />
          );
        })}
      </div>

      {/* Free colour picker */}
      <div className="accent-color-picker__free-pick">
        <label
          htmlFor={freePickId}
          className="accent-color-picker__free-pick-label"
        >
          Custom colour
        </label>
        <input
          id={freePickId}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="accent-color-picker__color-input"
          aria-label="Pick a custom accent colour"
        />
        <span className="accent-color-picker__hex-value">{value}</span>
      </div>

      {/* WCAG warning */}
      {!passesContrast && (
        <p
          className="accent-color-picker__contrast-warning"
          role="alert"
          aria-live="polite"
        >
          ⚠️ This colour may not meet WCAG AA contrast requirements on light
          backgrounds. Consider choosing a darker shade.
        </p>
      )}

      {/* Reset link */}
      {value.toLowerCase() !== DEFAULT_ACCENT.toLowerCase() && (
        <button
          type="button"
          className="accent-color-picker__reset"
          onClick={onReset}
        >
          Reset to default
        </button>
      )}
    </div>
  );
}

export default AccentColorPicker;
