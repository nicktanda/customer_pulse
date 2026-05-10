"use client";

import React, { useId, useState } from "react";
import {
  ACCENT_COLOR_SWATCHES,
  DEFAULT_ACCENT_COLOR,
  isValidHex,
} from "../lib/accentColor";
import { useAccentColor } from "../hooks/useAccentColor";

export interface AccentColorPickerProps {
  /** Initial value – pass the server-persisted preference if available */
  initialValue?: string | null;
  /** Called whenever the user commits a new valid colour */
  onChange?: (hex: string) => void;
}

/**
 * AccentColorPicker
 *
 * Renders a curated swatch palette plus an advanced free-colour-pick input.
 * Warns when the chosen colour fails WCAG AA contrast against white.
 */
export function AccentColorPicker({
  initialValue,
  onChange,
}: AccentColorPickerProps) {
  const { accentColor, contrastWarning, setAccentColor, resetToDefault } =
    useAccentColor(initialValue);

  // customHex mirrors accentColor so the text input stays in sync
  // when the user picks a swatch, and also holds in-progress typed values.
  const [customHex, setCustomHex] = useState(accentColor);
  const [customError, setCustomError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const inputId = useId();

  function handleSwatchClick(hex: string) {
    setAccentColor(hex);
    setCustomHex(hex);
    onChange?.(hex);
  }

  function handleCustomChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setCustomHex(value);
    setCustomError("");
  }

  function handleCustomCommit() {
    const hex = customHex.startsWith("#") ? customHex : `#${customHex}`;
    if (!isValidHex(hex)) {
      setCustomError("Please enter a valid hex colour, e.g. #3b82f6");
      return;
    }
    setCustomError("");
    setAccentColor(hex);
    onChange?.(hex);
  }

  function handleColorInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const hex = e.target.value;
    setCustomHex(hex);
    if (isValidHex(hex)) {
      setAccentColor(hex);
      onChange?.(hex);
    }
  }

  return (
    <div className="accent-color-picker" role="group" aria-label="Accent colour">
      {/* Swatch palette */}
      <div className="accent-color-picker__swatches" role="radiogroup" aria-label="Preset colours">
        {ACCENT_COLOR_SWATCHES.map((swatch) => (
          <button
            key={swatch.value}
            type="button"
            role="radio"
            aria-checked={accentColor === swatch.value}
            aria-label={swatch.label}
            title={swatch.label}
            className={[
              "accent-color-picker__swatch",
              accentColor === swatch.value
                ? "accent-color-picker__swatch--selected"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ background: swatch.value }}
            onClick={() => handleSwatchClick(swatch.value)}
          />
        ))}
      </div>

      {/* Current colour preview */}
      <div className="accent-color-picker__preview">
        <span
          className="accent-color-picker__preview-dot"
          style={{ background: accentColor }}
          aria-hidden="true"
        />
        <span className="accent-color-picker__preview-label">
          Current: <strong>{accentColor}</strong>
        </span>
      </div>

      {/* WCAG contrast warning */}
      {contrastWarning && (
        <p
          className="accent-color-picker__warning"
          role="alert"
          aria-live="polite"
        >
          ⚠️ This colour may be hard to read on light backgrounds (WCAG AA
          contrast not met). Consider choosing a darker shade.
        </p>
      )}

      {/* Advanced free-pick */}
      <button
        type="button"
        className="accent-color-picker__toggle"
        aria-expanded={showAdvanced}
        onClick={() => setShowAdvanced((v) => !v)}
      >
        {showAdvanced ? "Hide" : "Show"} custom colour
      </button>

      {showAdvanced && (
        <div className="accent-color-picker__advanced">
          {/* Native colour picker for visual selection */}
          <label htmlFor={`${inputId}-native`} className="sr-only">
            Pick a custom colour
          </label>
          <input
            id={`${inputId}-native`}
            type="color"
            value={isValidHex(accentColor) ? accentColor : DEFAULT_ACCENT_COLOR}
            onChange={handleColorInputChange}
            className="accent-color-picker__native"
            title="Custom colour"
          />

          {/* Hex text input */}
          <div className="accent-color-picker__hex-row">
            <label
              htmlFor={`${inputId}-hex`}
              className="accent-color-picker__hex-label"
            >
              Hex value
            </label>
            <input
              id={`${inputId}-hex`}
              type="text"
              value={customHex}
              placeholder="#3b82f6"
              maxLength={7}
              className="accent-color-picker__hex-input"
              onChange={handleCustomChange}
              onBlur={handleCustomCommit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCustomCommit();
              }}
              aria-invalid={Boolean(customError)}
              aria-describedby={customError ? `${inputId}-error` : undefined}
            />
            <button
              type="button"
              className="accent-color-picker__apply-btn"
              onClick={handleCustomCommit}
            >
              Apply
            </button>
          </div>

          {customError && (
            <p
              id={`${inputId}-error`}
              className="accent-color-picker__error"
              role="alert"
            >
              {customError}
            </p>
          )}
        </div>
      )}

      {/* Reset */}
      {accentColor !== DEFAULT_ACCENT_COLOR && (
        <button
          type="button"
          className="accent-color-picker__reset"
          onClick={() => {
            resetToDefault();
            setCustomHex(DEFAULT_ACCENT_COLOR);
            onChange?.(DEFAULT_ACCENT_COLOR);
          }}
        >
          Reset to default
        </button>
      )}
    </div>
  );
}
