"use client";

import React, { useId, useState } from "react";
import {
  ACCENT_PALETTE,
  DEFAULT_ACCENT_COLOR,
  contrastRatio,
  isValidHexColor,
  passesWcagAA,
} from "../lib/accentColor";

export interface AccentColorPickerProps {
  /** Currently selected accent colour (hex). */
  value: string;
  /** Called when the user selects a new colour. */
  onChange: (hex: string) => void;
  /** Whether to render the advanced free-pick input. Defaults to false. */
  allowCustom?: boolean;
  className?: string;
}

/**
 * AccentColorPicker
 *
 * Renders a palette of curated swatches plus an optional free colour-picker
 * input. Displays an accessibility warning when the chosen colour fails
 * WCAG AA contrast against white.
 */
export function AccentColorPicker({
  value,
  onChange,
  allowCustom = true,
  className = "",
}: AccentColorPickerProps) {
  const labelId = useId();
  const [showCustom, setShowCustom] = useState(false);
  const [customInput, setCustomInput] = useState(value);

  const handleSwatchClick = (hex: string) => {
    onChange(hex);
    setCustomInput(hex);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setCustomInput(hex);
    if (isValidHexColor(hex)) {
      onChange(hex);
    }
  };

  const passes = passesWcagAA(value);
  const ratio = contrastRatio(value, "#ffffff");

  return (
    <div className={`accent-color-picker ${className}`} role="group" aria-labelledby={labelId}>
      <p id={labelId} className="accent-color-picker__label">
        Accent colour
      </p>

      {/* Palette swatches */}
      <div className="accent-color-picker__swatches" role="listbox" aria-label="Accent colour palette">
        {ACCENT_PALETTE.map((color) => {
          const isSelected = value.toLowerCase() === color.value.toLowerCase();
          return (
            <button
              key={color.value}
              type="button"
              role="option"
              aria-selected={isSelected}
              aria-label={color.label}
              title={color.label}
              className={`accent-color-picker__swatch${
                isSelected ? " accent-color-picker__swatch--selected" : ""
              }`}
              style={{ backgroundColor: color.value }}
              onClick={() => handleSwatchClick(color.value)}
            />
          );
        })}
      </div>

      {/* Advanced / free pick */}
      {allowCustom && (
        <div className="accent-color-picker__advanced">
          <button
            type="button"
            className="accent-color-picker__toggle-custom"
            onClick={() => setShowCustom((s) => !s)}
            aria-expanded={showCustom}
          >
            {showCustom ? "Hide custom colour" : "Custom colour…"}
          </button>

          {showCustom && (
            <div className="accent-color-picker__custom-row">
              {/* Native colour picker */}
              <input
                type="color"
                id="accent-color-native"
                value={isValidHexColor(customInput) ? customInput : DEFAULT_ACCENT_COLOR}
                onChange={(e) => {
                  setCustomInput(e.target.value);
                  onChange(e.target.value);
                }}
                className="accent-color-picker__native"
                aria-label="Choose custom accent colour"
              />

              {/* Hex text input */}
              <input
                type="text"
                value={customInput}
                onChange={handleCustomChange}
                maxLength={7}
                placeholder="#6366f1"
                className={`accent-color-picker__hex-input${
                  isValidHexColor(customInput) ? "" : " accent-color-picker__hex-input--invalid"
                }`}
                aria-label="Hex colour value"
                aria-invalid={!isValidHexColor(customInput)}
              />
            </div>
          )}
        </div>
      )}

      {/* WCAG contrast warning */}
      {!passes && (
        <p className="accent-color-picker__warning" role="alert">
          ⚠️ This colour has a contrast ratio of {ratio.toFixed(2)}:1 against white,
          which does not meet WCAG AA (4.5:1). Text may be hard to read.
        </p>
      )}

      {/* Reset link */}
      <button
        type="button"
        className="accent-color-picker__reset"
        onClick={() => {
          onChange(DEFAULT_ACCENT_COLOR);
          setCustomInput(DEFAULT_ACCENT_COLOR);
        }}
      >
        Reset to default
      </button>
    </div>
  );
}
