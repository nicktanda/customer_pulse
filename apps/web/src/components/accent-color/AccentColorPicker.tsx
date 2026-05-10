"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";

export const ACCENT_PALETTE: { name: string; value: string }[] = [
  { name: "Brand Blue", value: "#2563eb" },
  { name: "Violet", value: "#7c3aed" },
  { name: "Rose", value: "#e11d48" },
  { name: "Amber", value: "#d97706" },
  { name: "Emerald", value: "#059669" },
  { name: "Teal", value: "#0d9488" },
  { name: "Sky", value: "#0284c7" },
  { name: "Fuchsia", value: "#a21caf" },
  { name: "Orange", value: "#ea580c" },
  { name: "Lime", value: "#65a30d" },
];

export const DEFAULT_ACCENT = "#2563eb";

/**
 * Calculate relative luminance of a hex colour.
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function relativeLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Contrast ratio between two hex colours.
 */
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns true if the accent colour passes WCAG AA (4.5:1) against white.
 */
export function passesWcagAA(hex: string): boolean {
  try {
    return contrastRatio(hex, "#ffffff") >= 4.5;
  } catch {
    return false;
  }
}

interface AccentColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export function AccentColorPicker({
  value = DEFAULT_ACCENT,
  onChange,
  disabled = false,
}: AccentColorPickerProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customValue, setCustomValue] = useState(value);
  const [wcagWarn, setWcagWarn] = useState(false);
  const freePickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCustomValue(value);
    setWcagWarn(!passesWcagAA(value));
  }, [value]);

  const handleSwatchClick = useCallback(
    (color: string) => {
      if (disabled) return;
      setWcagWarn(!passesWcagAA(color));
      onChange(color);
    },
    [disabled, onChange]
  );

  const handleFreePickChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const color = e.target.value;
      setCustomValue(color);
      setWcagWarn(!passesWcagAA(color));
      onChange(color);
    },
    [onChange]
  );

  return (
    <div className="accent-color-picker" aria-label="Accent colour picker">
      <div className="accent-color-picker__swatches" role="radiogroup" aria-label="Preset accent colours">
        {ACCENT_PALETTE.map((swatch) => (
          <button
            key={swatch.value}
            type="button"
            role="radio"
            aria-checked={value === swatch.value}
            aria-label={swatch.name}
            title={swatch.name}
            disabled={disabled}
            className={[
              "accent-color-picker__swatch",
              value === swatch.value ? "accent-color-picker__swatch--selected" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ backgroundColor: swatch.value }}
            onClick={() => handleSwatchClick(swatch.value)}
          />
        ))}
      </div>

      <button
        type="button"
        className="accent-color-picker__advanced-toggle"
        onClick={() => setShowAdvanced((v) => !v)}
        disabled={disabled}
        aria-expanded={showAdvanced}
      >
        {showAdvanced ? "Hide advanced" : "Custom colour…"}
      </button>

      {showAdvanced && (
        <div className="accent-color-picker__advanced">
          <label htmlFor="accent-free-pick" className="accent-color-picker__label">
            Pick any colour
          </label>
          <div className="accent-color-picker__free-row">
            <input
              ref={freePickerRef}
              id="accent-free-pick"
              type="color"
              value={customValue}
              onChange={handleFreePickChange}
              disabled={disabled}
              className="accent-color-picker__free-input"
            />
            <span className="accent-color-picker__hex-label">{customValue.toUpperCase()}</span>
          </div>
          {wcagWarn && (
            <p className="accent-color-picker__wcag-warn" role="alert">
              ⚠️ This colour may have low contrast against white backgrounds and could be hard to read (WCAG AA requires 4.5:1).
            </p>
          )}
        </div>
      )}

      <style>{`
        .accent-color-picker {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .accent-color-picker__swatches {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .accent-color-picker__swatch {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          padding: 0;
          transition: transform 0.1s, border-color 0.1s;
          outline-offset: 2px;
        }
        .accent-color-picker__swatch:hover:not(:disabled) {
          transform: scale(1.15);
        }
        .accent-color-picker__swatch--selected {
          border-color: #000;
          box-shadow: 0 0 0 2px #fff inset;
        }
        .accent-color-picker__swatch:focus-visible {
          outline: 2px solid var(--color-accent, #2563eb);
        }
        .accent-color-picker__swatch:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .accent-color-picker__advanced-toggle {
          background: none;
          border: none;
          padding: 0;
          font-size: 0.875rem;
          color: var(--color-accent, #2563eb);
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
          width: fit-content;
        }
        .accent-color-picker__advanced-toggle:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .accent-color-picker__advanced {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .accent-color-picker__label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }
        .accent-color-picker__free-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .accent-color-picker__free-input {
          width: 48px;
          height: 36px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          cursor: pointer;
          padding: 2px;
          background: none;
        }
        .accent-color-picker__hex-label {
          font-size: 0.875rem;
          font-family: monospace;
          color: #6b7280;
        }
        .accent-color-picker__wcag-warn {
          font-size: 0.8125rem;
          color: #92400e;
          background: #fef3c7;
          border: 1px solid #fde68a;
          border-radius: 6px;
          padding: 8px 10px;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
