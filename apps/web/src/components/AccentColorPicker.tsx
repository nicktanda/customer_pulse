"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  CURATED_PALETTE,
  DEFAULT_ACCENT,
  applyAccentColor,
  contrastRatio,
  isValidHex,
} from "../lib/accentColor";

interface AccentColorPickerProps {
  /** Current accent hex value */
  value: string;
  /** Called when the user commits a new colour */
  onChange: (hex: string) => void;
  /** Whether the save operation is in-flight */
  isSaving?: boolean;
}

/**
 * AccentColorPicker
 *
 * Displays:
 *   1. A row of curated palette swatches
 *   2. An "advanced" free-pick colour input
 *   3. A contrast-ratio warning when the chosen colour fails WCAG AA
 *
 * Note: `handleSwatchClick` calls `applyAccentColor` directly for an
 * immediate visual preview before the parent commits. In the current wiring
 * (`AccentColorSettings`), `onChange` is `setPending` which does NOT call
 * `applyAccentColor` again, so there is no double-apply. If you wire
 * `onChange` directly to `setAccentColor` (from the context), the second
 * apply would be a harmless no-op because `applyAccentColor` validates the
 * hex and writes the same value.
 */
export function AccentColorPicker({
  value,
  onChange,
  isSaving = false,
}: AccentColorPickerProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [freeHex, setFreeHex] = useState(value);
  const [hexError, setHexError] = useState<string | null>(null);
  const freeInputRef = useRef<HTMLInputElement>(null);

  // Keep freeHex in sync when parent value changes (e.g. initial load)
  useEffect(() => {
    setFreeHex(value);
  }, [value]);

  // Clear hex error when the advanced panel is closed and reopened
  useEffect(() => {
    if (!showAdvanced) {
      setHexError(null);
    }
  }, [showAdvanced]);

  const handleSwatchClick = useCallback(
    (hex: string) => {
      applyAccentColor(hex);
      onChange(hex);
    },
    [onChange]
  );

  const handleFreeHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setFreeHex(raw);
    if (!isValidHex(raw)) {
      setHexError("Enter a valid hex colour, e.g. #3b82f6");
      return;
    }
    setHexError(null);
    applyAccentColor(raw);
  };

  const handleFreeHexCommit = () => {
    if (!isValidHex(freeHex)) return;
    onChange(freeHex);
  };

  const handleFreeColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value; // browser colour picker always returns valid hex
    setFreeHex(hex);
    setHexError(null);
    applyAccentColor(hex);
    onChange(hex);
  };

  const ratio = contrastRatio(value, "#ffffff");
  const failsAA = ratio !== null && ratio < 4.5;

  return (
    <div className="accent-color-picker" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Curated swatches */}
      <div
        role="group"
        aria-label="Accent colour palette"
        style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
      >
        {CURATED_PALETTE.map((swatch) => (
          <button
            key={swatch.value}
            type="button"
            className="accent-swatch"
            aria-label={swatch.label}
            aria-pressed={value === swatch.value}
            style={{ backgroundColor: swatch.value }}
            onClick={() => handleSwatchClick(swatch.value)}
            disabled={isSaving}
          />
        ))}

        {/* Reset to default */}
        <button
          type="button"
          className="accent-swatch"
          aria-label="Reset to default"
          aria-pressed={value === DEFAULT_ACCENT}
          style={{
            backgroundColor: "#f3f4f6",
            border: "1px dashed #9ca3af",
            fontSize: "0.6rem",
            color: "#374151",
            borderRadius: "50%",
          }}
          onClick={() => handleSwatchClick(DEFAULT_ACCENT)}
          disabled={isSaving}
          title="Reset to default"
        >
          ↺
        </button>
      </div>

      {/* Contrast warning */}
      {failsAA && (
        <p
          role="alert"
          style={{
            color: "#b45309",
            backgroundColor: "#fef3c7",
            border: "1px solid #f59e0b",
            borderRadius: "0.375rem",
            padding: "0.5rem 0.75rem",
            fontSize: "0.875rem",
            margin: 0,
          }}
        >
          ⚠️ This colour has a contrast ratio of {ratio?.toFixed(2)}:1 against
          white, which is below the WCAG AA minimum of 4.5:1. Text may be hard
          to read.
        </p>
      )}

      {/* Advanced picker toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        style={{
          background: "none",
          border: "none",
          color: "var(--color-accent)",
          cursor: "pointer",
          fontSize: "0.875rem",
          padding: 0,
          textAlign: "left",
          textDecoration: "underline",
          width: "fit-content",
        }}
      >
        {showAdvanced ? "Hide advanced" : "Choose a custom colour"}
      </button>

      {showAdvanced && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            padding: "1rem",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
            backgroundColor: "#f9fafb",
          }}
        >
          <label
            htmlFor="accent-free-color"
            style={{ fontSize: "0.875rem", fontWeight: 500 }}
          >
            Pick any colour
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <input
              id="accent-free-color"
              type="color"
              value={isValidHex(freeHex) ? freeHex : DEFAULT_ACCENT}
              onChange={handleFreeColorInput}
              disabled={isSaving}
              style={{ width: "3rem", height: "2.5rem", cursor: "pointer", border: "none" }}
            />
            <input
              ref={freeInputRef}
              type="text"
              value={freeHex}
              onChange={handleFreeHexChange}
              onBlur={handleFreeHexCommit}
              onKeyDown={(e) => e.key === "Enter" && handleFreeHexCommit()}
              disabled={isSaving}
              placeholder="#6366f1"
              aria-label="Hex colour value"
              aria-describedby={hexError ? "hex-error" : undefined}
              style={{
                fontFamily: "monospace",
                fontSize: "0.9rem",
                padding: "0.4rem 0.6rem",
                border: `1px solid ${hexError ? "#ef4444" : "#d1d5db"}`,
                borderRadius: "0.375rem",
                width: "8rem",
              }}
            />
          </div>
          {hexError && (
            <p
              id="hex-error"
              role="alert"
              style={{ color: "#ef4444", fontSize: "0.8rem", margin: 0 }}
            >
              {hexError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default AccentColorPicker;
