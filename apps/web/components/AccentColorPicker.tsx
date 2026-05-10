"use client";

import React, { useState, useId } from "react";
import {
  ACCENT_COLOR_SWATCHES,
  DEFAULT_ACCENT_COLOR,
  contrastRatio,
  meetsWcagAA,
  isValidHex,
} from "@/lib/accentColor";
import { useAccentColor } from "@/hooks/useAccentColor";

interface AccentColorPickerProps {
  /** Called after a new colour is committed (swatch click or free-pick confirm). */
  onSave?: (hex: string) => void;
}

export function AccentColorPicker({ onSave }: AccentColorPickerProps) {
  const { accentColor, setAccentColor, resetAccentColor } = useAccentColor();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [freePickValue, setFreePickValue] = useState(accentColor);
  const [freePickInput, setFreePickInput] = useState(accentColor);
  const freePickId = useId();
  const advancedPanelId = useId();

  const handleSwatchClick = (hex: string) => {
    setAccentColor(hex);
    setFreePickValue(hex);
    setFreePickInput(hex);
    onSave?.(hex);
  };

  const handleFreePickChange = (hex: string) => {
    setFreePickValue(hex);
    setFreePickInput(hex);
    // Live preview as the user drags the native picker
    if (isValidHex(hex)) setAccentColor(hex);
  };

  const handleHexInputChange = (raw: string) => {
    setFreePickInput(raw);
    const normalised = raw.startsWith("#") ? raw : `#${raw}`;
    if (isValidHex(normalised)) {
      setFreePickValue(normalised);
      setAccentColor(normalised);
    }
  };

  const handleFreePickConfirm = () => {
    if (isValidHex(freePickValue)) {
      onSave?.(freePickValue);
    }
  };

  const handleReset = () => {
    resetAccentColor();
    setFreePickValue(DEFAULT_ACCENT_COLOR);
    setFreePickInput(DEFAULT_ACCENT_COLOR);
    onSave?.(DEFAULT_ACCENT_COLOR);
  };

  const contrastAgainstWhite = contrastRatio(accentColor, "#ffffff");
  const passes = meetsWcagAA(accentColor);

  return (
    <div className="accent-color-picker">
      <div className="accent-color-picker__header">
        <h3 className="accent-color-picker__title">Accent colour</h3>
        <span
          className="accent-color-picker__preview"
          style={{ backgroundColor: accentColor }}
          aria-hidden="true"
        />
      </div>

      <p className="accent-color-picker__description">
        Customise the highlight colour used for buttons, active states, and
        focus rings across the app.
      </p>

      {/* Curated swatches */}
      <div
        className="accent-color-picker__swatches"
        role="radiogroup"
        aria-label="Accent colour palette"
      >
        {ACCENT_COLOR_SWATCHES.map((swatch) => {
          const isSelected = accentColor === swatch.value;
          return (
            <button
              key={swatch.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={swatch.name}
              title={swatch.name}
              className={`accent-color-picker__swatch${
                isSelected ? " accent-color-picker__swatch--selected" : ""
              }`}
              style={{ backgroundColor: swatch.value }}
              onClick={() => handleSwatchClick(swatch.value)}
            />
          );
        })}
      </div>

      {/* WCAG contrast warning */}
      {!passes && (
        <p className="accent-color-picker__warning" role="alert">
          ⚠️ Contrast ratio {contrastAgainstWhite.toFixed(2)}:1 is below the
          WCAG AA minimum (4.5:1) against a white background. Text on this
          colour may be hard to read.
        </p>
      )}

      {/* Advanced / free-pick */}
      <button
        type="button"
        className="accent-color-picker__advanced-toggle"
        onClick={() => setShowAdvanced((v) => !v)}
        aria-expanded={showAdvanced}
        aria-controls={advancedPanelId}
      >
        {showAdvanced ? "Hide" : "Show"} custom colour
      </button>

      {showAdvanced && (
        <div id={advancedPanelId} className="accent-color-picker__advanced">
          <label
            htmlFor={freePickId}
            className="accent-color-picker__label"
          >
            Pick any colour
          </label>
          <div className="accent-color-picker__free-row">
            <input
              id={freePickId}
              type="color"
              value={freePickValue}
              onChange={(e) => handleFreePickChange(e.target.value)}
              className="accent-color-picker__color-input"
              aria-label="Custom accent colour picker"
            />
            <input
              type="text"
              value={freePickInput}
              onChange={(e) => handleHexInputChange(e.target.value)}
              maxLength={7}
              placeholder="#6366f1"
              className="accent-color-picker__hex-input"
              aria-label="Hex colour value"
              spellCheck={false}
            />
            <button
              type="button"
              className="accent-color-picker__confirm-btn"
              onClick={handleFreePickConfirm}
              disabled={!isValidHex(freePickValue)}
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Reset */}
      {accentColor !== DEFAULT_ACCENT_COLOR && (
        <button
          type="button"
          className="accent-color-picker__reset"
          onClick={handleReset}
        >
          Reset to default
        </button>
      )}
    </div>
  );
}
