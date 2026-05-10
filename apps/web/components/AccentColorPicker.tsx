"use client";

import React, { useId, useRef, useState } from "react";
import { ACCENT_PALETTE, isValidHex } from "../lib/accentColor";
import { useAccentColor } from "../hooks/useAccentColor";
import "./AccentColorPicker.css";

export function AccentColorPicker() {
  const {
    isEnabled,
    accentColor,
    hasContrastWarning,
    setAccentColor,
    resetAccentColor,
  } = useAccentColor();

  const [showFreePick, setShowFreePick] = useState(false);
  // freePickInput mirrors accentColor; swatch clicks keep it in sync via handleSwatchClick
  const [freePickInput, setFreePickInput] = useState(accentColor);
  const [freePickError, setFreePickError] = useState("");
  const freePickInputId = useId();
  const nativePickerRef = useRef<HTMLInputElement>(null);

  if (!isEnabled) return null;

  function handleSwatchClick(hex: string) {
    setAccentColor(hex);
    setFreePickInput(hex);
    setFreePickError("");
  }

  function handleFreePickSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = freePickInput.trim();
    const normalised = val.startsWith("#") ? val : `#${val}`;
    if (!isValidHex(normalised)) {
      setFreePickError("Please enter a valid 6-digit hex colour, e.g. #3B82F6");
      return;
    }
    setFreePickError("");
    setAccentColor(normalised);
  }

  function handleNativePicker(e: React.ChangeEvent<HTMLInputElement>) {
    const hex = e.target.value;
    setFreePickInput(hex);
    setAccentColor(hex);
    setFreePickError("");
  }

  return (
    <section aria-labelledby="accent-color-heading" className="accent-color-picker">
      <div className="accent-color-picker__header">
        <h3 id="accent-color-heading" className="accent-color-picker__title">
          Accent colour
        </h3>
        <button
          type="button"
          className="accent-color-picker__reset"
          onClick={resetAccentColor}
          aria-label="Reset accent colour to default"
        >
          Reset to default
        </button>
      </div>

      <p className="accent-color-picker__description">
        Choose the highlight colour used for buttons, links, and focus rings.
      </p>

      {/* Curated palette */}
      <div
        role="radiogroup"
        aria-label="Accent colour palette"
        className="accent-color-picker__palette"
      >
        {ACCENT_PALETTE.map((swatch) => (
          <button
            key={swatch.id}
            type="button"
            role="radio"
            aria-checked={accentColor.toLowerCase() === swatch.value.toLowerCase()}
            aria-label={swatch.label}
            title={swatch.label}
            className="accent-color-picker__swatch"
            style={{ backgroundColor: swatch.value }}
            onClick={() => handleSwatchClick(swatch.value)}
          >
            {accentColor.toLowerCase() === swatch.value.toLowerCase() && (
              <svg
                viewBox="0 0 16 16"
                aria-hidden="true"
                className="accent-color-picker__swatch-check"
              >
                <path
                  d="M3 8l3.5 3.5 6.5-7"
                  stroke="#fff"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        ))}
      </div>

      {/* Advanced free pick toggle */}
      <button
        type="button"
        className="accent-color-picker__advanced-toggle"
        aria-expanded={showFreePick}
        onClick={() => setShowFreePick((v) => !v)}
      >
        {showFreePick ? "Hide" : "Choose a custom colour"}
      </button>

      {showFreePick && (
        <form
          onSubmit={handleFreePickSubmit}
          className="accent-color-picker__free-pick"
        >
          <div className="accent-color-picker__free-pick-row">
            {/* Native colour picker — always produces a valid 6-digit hex value */}
            <input
              ref={nativePickerRef}
              type="color"
              value={accentColor}
              onChange={handleNativePicker}
              aria-label="Open colour picker"
              className="accent-color-picker__native-picker"
            />

            {/* Hex text input */}
            <label
              htmlFor={freePickInputId}
              className="accent-color-picker__hex-label"
            >
              Hex
            </label>
            <input
              id={freePickInputId}
              type="text"
              value={freePickInput}
              onChange={(e) => setFreePickInput(e.target.value)}
              placeholder="#4F46E5"
              maxLength={7}
              spellCheck={false}
              autoComplete="off"
              className="accent-color-picker__hex-input"
              aria-describedby={
                freePickError ? `${freePickInputId}-error` : undefined
              }
            />
            <button
              type="submit"
              className="accent-color-picker__apply-btn"
            >
              Apply
            </button>
          </div>

          {freePickError && (
            <p
              id={`${freePickInputId}-error`}
              role="alert"
              className="accent-color-picker__error"
            >
              {freePickError}
            </p>
          )}
        </form>
      )}

      {/* WCAG contrast warning */}
      {hasContrastWarning && (
        <div role="alert" className="accent-color-picker__contrast-warning">
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className="accent-color-picker__warning-icon"
          >
            <path
              d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 4a1 1 0 011 1v4a1 1 0 01-2 0V7a1 1 0 011-1zm0 8a1 1 0 100-2 1 1 0 000 2z"
              fill="currentColor"
            />
          </svg>
          <span>
            This colour may be hard to read on light backgrounds (WCAG AA
            contrast not met). Consider choosing a darker shade.
          </span>
        </div>
      )}

      {/* Live preview */}
      <div className="accent-color-picker__preview" aria-label="Live preview">
        <button
          type="button"
          className="accent-color-picker__preview-btn"
          style={{
            backgroundColor: "var(--color-accent, #4F46E5)",
          }}
        >
          Primary button
        </button>
        <a
          href="#"
          className="accent-color-picker__preview-link"
          style={{ color: "var(--color-accent, #4F46E5)" }}
          onClick={(e) => e.preventDefault()}
        >
          Accent link
        </a>
        <span
          className="accent-color-picker__preview-badge"
          style={{
            backgroundColor: "var(--color-accent, #4F46E5)",
          }}
        >
          Badge
        </span>
      </div>
    </section>
  );
}
