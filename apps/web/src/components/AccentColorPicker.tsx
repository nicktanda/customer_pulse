"use client";

import React, { useId, useEffect, useState } from "react";
import { ACCENT_PALETTE, contrastRatio, meetsWcagAA } from "../lib/accent-color";

interface AccentColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  isSaving?: boolean;
  contrastWarning?: boolean;
}

export function AccentColorPicker({
  value,
  onChange,
  isSaving = false,
  contrastWarning = false,
}: AccentColorPickerProps) {
  const freePickerId = useId();
  const [showFreePicker, setShowFreePicker] = useState(false);
  const [freeValue, setFreeValue] = useState(value);

  // Keep freeValue in sync with the value prop when the free picker is hidden
  // (e.g. a palette swatch was selected externally)
  useEffect(() => {
    if (!showFreePicker) {
      setFreeValue(value);
    }
  }, [value, showFreePicker]);

  const handleSwatchClick = (hex: string) => {
    onChange(hex);
    setFreeValue(hex);
    setShowFreePicker(false);
  };

  const handleFreeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setFreeValue(hex);
    onChange(hex);
  };

  return (
    <div className="accent-picker" role="group" aria-label="Accent colour">
      <p className="accent-picker__label">Accent colour</p>

      {/* Curated palette */}
      <div className="accent-picker__swatches" role="radiogroup">
        {ACCENT_PALETTE.map((colour) => {
          const isSelected = value.toLowerCase() === colour.value.toLowerCase();
          return (
            <button
              key={colour.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={colour.label}
              title={colour.label}
              className={`accent-picker__swatch${
                isSelected ? " accent-picker__swatch--selected" : ""
              }`}
              style={{ backgroundColor: colour.value }}
              onClick={() => handleSwatchClick(colour.value)}
            />
          );
        })}

        {/* Toggle free picker */}
        <button
          type="button"
          className={`accent-picker__swatch accent-picker__swatch--custom${
            showFreePicker ? " accent-picker__swatch--selected" : ""
          }`}
          aria-label="Custom colour"
          title="Custom colour"
          onClick={() => setShowFreePicker((v) => !v)}
          aria-expanded={showFreePicker}
        >
          <span aria-hidden="true">✏️</span>
        </button>
      </div>

      {/* Free colour picker */}
      {showFreePicker && (
        <div className="accent-picker__free">
          <label htmlFor={freePickerId} className="accent-picker__free-label">
            Custom colour
          </label>
          <input
            id={freePickerId}
            type="color"
            value={freeValue}
            onChange={handleFreeChange}
            className="accent-picker__free-input"
          />
          <span className="accent-picker__free-hex">{freeValue}</span>

          {/* Contrast feedback */}
          <span
            className={`accent-picker__contrast${
              meetsWcagAA(freeValue)
                ? " accent-picker__contrast--pass"
                : " accent-picker__contrast--fail"
            }`}
          >
            Contrast ratio:{" "}
            {(contrastRatio(freeValue, "#FFFFFF") ?? 0).toFixed(2)}:1{" "}
            {meetsWcagAA(freeValue) ? "✓ AA" : "✗ Fails AA"}
          </span>
        </div>
      )}

      {/* Global contrast warning */}
      {contrastWarning && (
        <p className="accent-picker__warning" role="alert">
          ⚠ This colour may be hard to read on white backgrounds (WCAG AA
          requires 4.5:1 contrast).
        </p>
      )}

      {isSaving && (
        <p className="accent-picker__saving" aria-live="polite">
          Saving…
        </p>
      )}
    </div>
  );
}
