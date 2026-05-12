"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import "../styles/accent-colour-picker.css";

export const CURATED_PALETTE: { label: string; value: string }[] = [
  { label: "Indigo", value: "#6366f1" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Sky", value: "#0ea5e9" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Emerald", value: "#10b981" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Pink", value: "#ec4899" },
  { label: "Orange", value: "#f97316" },
  { label: "Cyan", value: "#06b6d4" },
];

const DEFAULT_ACCENT = "#6366f1";
const STORAGE_KEY = "user_accent_colour";

/** Relative luminance per WCAG 2.1 (uses 0.04045 cutoff per the current spec) */
function relativeLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** Contrast ratio against white (#ffffff) */
export function contrastAgainstWhite(hex: string): number {
  const L = relativeLuminance(hex);
  const white = 1;
  return (white + 0.05) / (L + 0.05);
}

/** Returns true when hex is a valid 6-digit hex colour */
export function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

function applyAccentColour(colour: string) {
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty("--color-accent", colour);
  }
}

/**
 * Reads the stored accent colour from localStorage.
 * Safe to call only after the component has mounted (client-side only).
 * Falls back to the default accent when localStorage is unavailable.
 */
export function loadStoredAccent(): string {
  if (typeof localStorage === "undefined") return DEFAULT_ACCENT;
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_ACCENT;
}

function saveAccent(colour: string) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, colour);
  }
}

interface AccentColourPickerProps {
  /** Called whenever a valid new accent colour is committed */
  onChange?: (colour: string) => void;
  /**
   * Initial value; falls back to localStorage then default.
   * Note: if provided from a server preference, it overrides the stored
   * local value on first render but does not automatically update localStorage.
   */
  initialColour?: string;
}

export default function AccentColourPicker({
  onChange,
  initialColour,
}: AccentColourPickerProps) {
  // Compute the initial value once to avoid two localStorage.getItem calls.
  const [selected, setSelected] = useState<string>(
    () => initialColour ?? loadStoredAccent()
  );
  // freeInput shares the same initial value without a second localStorage read.
  const [freeInput, setFreeInput] = useState<string>(selected);
  const [showFree, setShowFree] = useState(false);
  const [contrastWarning, setContrastWarning] = useState(false);
  const freeInputRef = useRef<HTMLInputElement>(null);

  const commit = useCallback(
    (colour: string) => {
      setSelected(colour);
      setFreeInput(colour);
      applyAccentColour(colour);
      saveAccent(colour);
      // WCAG AA: 4.5:1 for normal text, 3:1 for large text / UI components.
      // We warn below 4.5:1 to cover the preview button (small text, ~0.875 rem).
      const ratio = contrastAgainstWhite(colour);
      setContrastWarning(ratio < 4.5);
      onChange?.(colour);
    },
    [onChange]
  );

  // Apply stored/initial colour on mount.
  // `selected` is intentionally excluded from the dependency array because
  // this effect should only run once on mount to initialise the CSS custom
  // property — subsequent changes are handled synchronously in `commit`.
  useEffect(() => {
    applyAccentColour(selected);
    const ratio = contrastAgainstWhite(selected);
    setContrastWarning(ratio < 4.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFreeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFreeInput(val);
    if (isValidHex(val)) {
      commit(val);
    }
  };

  const handleFreeColourInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFreeInput(val);
    commit(val);
  };

  return (
    // Single landmark group; the radiogroup inside provides its own label.
    <div className="accent-colour-picker">
      <p className="accent-colour-picker__label">Accent colour</p>

      {/* Curated swatches */}
      <div className="accent-colour-picker__swatches" role="radiogroup" aria-label="Accent colour">
        {CURATED_PALETTE.map((swatch) => {
          const isActive = selected === swatch.value;
          return (
            <button
              key={swatch.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={swatch.label}
              title={swatch.label}
              className={`accent-colour-picker__swatch${
                isActive ? " accent-colour-picker__swatch--active" : ""
              }`}
              style={{ backgroundColor: swatch.value }}
              onClick={() => commit(swatch.value)}
            />
          );
        })}

        {/* Advanced / free pick toggle */}
        <button
          type="button"
          aria-label="Custom colour"
          title="Custom colour"
          className={`accent-colour-picker__swatch accent-colour-picker__swatch--custom${
            showFree ? " accent-colour-picker__swatch--active" : ""
          }`}
          onClick={() => {
            const next = !showFree;
            setShowFree(next);
            if (next) {
              // Focus the hex input once it is in the DOM.
              // Schedule after paint so the element exists.
              requestAnimationFrame(() => freeInputRef.current?.focus());
            }
          }}
        >
          <span aria-hidden>+</span>
        </button>
      </div>

      {/* Free colour picker */}
      {showFree && (
        <div className="accent-colour-picker__free">
          <input
            ref={freeInputRef}
            type="color"
            id="accent-free-colour"
            aria-label="Pick a custom colour"
            value={freeInput.length === 7 && isValidHex(freeInput) ? freeInput : "#000000"}
            onChange={handleFreeColourInput}
            className="accent-colour-picker__colour-input"
          />
          <input
            type="text"
            aria-label="Hex colour value"
            placeholder="#6366f1"
            value={freeInput}
            maxLength={7}
            onChange={handleFreeInputChange}
            className="accent-colour-picker__hex-input"
          />
        </div>
      )}

      {/* WCAG contrast warning */}
      {contrastWarning && (
        <p className="accent-colour-picker__warning" role="alert">
          ⚠️ This colour may have insufficient contrast against white backgrounds
          (below WCAG AA 4.5:1 for normal-sized text). Consider choosing a darker shade.
        </p>
      )}

      {/* Live preview */}
      <div className="accent-colour-picker__preview">
        <button
          type="button"
          className="accent-colour-picker__preview-btn"
          style={{ backgroundColor: selected, borderColor: selected }}
        >
          Preview button
        </button>
        <span
          className="accent-colour-picker__preview-highlight"
          style={{ backgroundColor: selected + "33", borderLeft: `3px solid ${selected}` }}
        >
          Highlighted text example
        </span>
      </div>
    </div>
  );
}
