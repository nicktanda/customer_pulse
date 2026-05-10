"use client";

import React, { useEffect, useId, useState } from "react";
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
 *
 * Browser support note: The preview badge and hex input focus ring use
 * `color-mix(in srgb, ...)` which requires Safari ≥ 16.2 / Chrome ≥ 111.
 * Older browsers will fall back to the opaque accent colour (no transparency).
 */
export function AccentColorPicker({
  value,
  onChange,
  allowCustom = true,
  className = "",
}: AccentColorPickerProps) {
  const groupId = useId();
  const nativePickerId = useId();
  const [showCustom, setShowCustom] = useState(false);
  // customInput tracks the text field; kept in sync with external value changes
  const [customInput, setCustomInput] = useState(value);

  // Sync customInput when the parent changes value externally (e.g. server fetch)
  useEffect(() => {
    setCustomInput(value);
  }, [value]);

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
    <div className={`accent-color-picker ${className}`}>
      <p id={`${groupId}-label`} className="accent-color-picker__label">
        Accent colour
      </p>

      {/*
       * Palette swatches
       * Using role="radiogroup" + role="radio" with aria-checked is the
       * correct ARIA pattern for a set of mutually-exclusive choices that
       * are not native <input type="radio"> elements.
       */}
      <div
        className="accent-color-picker__swatches"
        role="radiogroup"
        aria-labelledby={`${groupId}-label`}
      >
        {ACCENT_PALETTE.map((color) => {
          const isSelected = value.toLowerCase() === color.value.toLowerCase();
          return (
            <button
              key={color.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
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
              {/* Native colour picker – unique id per instance via useId() */}
              <input
                type="color"
                id={nativePickerId}
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
