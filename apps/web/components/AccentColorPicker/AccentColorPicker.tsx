"use client";

import React, { useId, useState, useEffect } from "react";
import {
  ACCENT_COLOR_PALETTE,
  DEFAULT_ACCENT_COLOR,
  contrastRatio,
  isValidHex,
  passesWcagAA,
  passesWcagAALarge,
} from "../../lib/accentColor";
import styles from "./AccentColorPicker.module.css";

export interface AccentColorPickerProps {
  /** Current accent colour value (hex). */
  value: string;
  /** Called whenever the selected colour changes (for instant preview). */
  onChange: (hex: string) => void;
  /** Called when the user explicitly saves their selection. */
  onSave: (hex: string) => Promise<void>;
  /** Whether a save is in progress. */
  isSaving?: boolean;
  /** Non-null error message from the last failed save attempt. */
  saveError?: string | null;
  /** Disable the whole component. */
  disabled?: boolean;
}

/**
 * AccentColorPicker
 *
 * Provides:
 *   - A curated palette of accessible swatches for quick selection
 *   - An optional free colour-picker (native <input type="color">)
 *   - A WCAG contrast ratio indicator with AA / AALarge badges
 *   - A Save button that calls `onSave` with the current value
 */
export const AccentColorPicker: React.FC<AccentColorPickerProps> = ({
  value,
  onChange,
  onSave,
  isSaving = false,
  saveError = null,
  disabled = false,
}) => {
  const id = useId();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [inputError, setInputError] = useState<string | null>(null);

  // Keep the hex text input in sync when `value` changes externally
  // (e.g. the user clicks a palette swatch while the advanced panel is open).
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const ratio = contrastRatio(value, "#ffffff");
  const wcagAA = passesWcagAA(value);
  const wcagAALarge = passesWcagAALarge(value);

  const handleSwatchClick = (hex: string) => {
    if (disabled) return;
    setInputError(null);
    onChange(hex);
  };

  const handleNativePicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setInputError(null);
    onChange(hex);
  };

  const handleHexInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim();
    setInputValue(raw);
    if (isValidHex(raw)) {
      setInputError(null);
      onChange(raw);
    } else {
      setInputError("Enter a valid hex colour, e.g. #6366f1");
    }
  };

  const handleSave = async () => {
    if (disabled || isSaving) return;
    await onSave(value);
  };

  const handleReset = () => {
    if (disabled) return;
    setInputError(null);
    onChange(DEFAULT_ACCENT_COLOR);
  };

  return (
    <div
      className={styles.root}
      aria-label="Accent colour picker"
      role="group"
    >
      {/* ── Section heading ─────────────────────────────────────────── */}
      <p className={styles.label} id={`${id}-label`}>
        Accent colour
      </p>
      <p className={styles.description}>
        Personalise highlights, buttons, and focus rings throughout the app.
      </p>

      {/* ── Curated palette ─────────────────────────────────────────── */}
      <div
        className={styles.palette}
        role="radiogroup"
        aria-labelledby={`${id}-label`}
      >
        {ACCENT_COLOR_PALETTE.map((swatch) => {
          const isSelected = value.toLowerCase() === swatch.value.toLowerCase();
          return (
            <button
              key={swatch.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={swatch.label}
              title={`${swatch.label} (${swatch.value})`}
              className={`${styles.swatch} ${
                isSelected ? styles.swatchSelected : ""
              }`}
              style={{ backgroundColor: swatch.value }}
              onClick={() => handleSwatchClick(swatch.value)}
              disabled={disabled}
            />
          );
        })}
      </div>

      {/* ── Advanced / free pick toggle ──────────────────────────────── */}
      <button
        type="button"
        className={styles.advancedToggle}
        onClick={() => setShowAdvanced((prev) => !prev)}
        aria-expanded={showAdvanced}
        disabled={disabled}
      >
        {showAdvanced ? "Hide" : "Custom colour"}
      </button>

      {showAdvanced && (
        <div className={styles.advanced}>
          <label className={styles.advancedLabel} htmlFor={`${id}-native`}>
            Pick any colour
          </label>
          <div className={styles.advancedRow}>
            <input
              id={`${id}-native`}
              type="color"
              value={isValidHex(inputValue) ? inputValue : DEFAULT_ACCENT_COLOR}
              onChange={handleNativePicker}
              className={styles.nativePicker}
              disabled={disabled}
            />
            <input
              type="text"
              value={inputValue}
              onChange={handleHexInput}
              placeholder="#6366f1"
              aria-label="Hex colour value"
              aria-invalid={!!inputError}
              aria-describedby={inputError ? `${id}-hex-error` : undefined}
              className={`${styles.hexInput} ${
                inputError ? styles.hexInputError : ""
              }`}
              maxLength={7}
              disabled={disabled}
            />
          </div>
          {inputError && (
            <p className={styles.errorText} id={`${id}-hex-error`} role="alert">
              {inputError}
            </p>
          )}
        </div>
      )}

      {/* ── WCAG contrast indicator ──────────────────────────────────── */}
      {/* aria-live="polite" on the container is sufficient; no role="alert" on children */}
      <div className={styles.contrastBlock} aria-live="polite">
        <span className={styles.contrastRatio}>
          Contrast vs white:{" "}
          <strong>{ratio !== null ? ratio.toFixed(2) : "—"}:1</strong>
        </span>
        <span
          className={`${styles.badge} ${
            wcagAA ? styles.badgePass : styles.badgeFail
          }`}
          title="WCAG 2.1 AA — normal text (4.5:1)"
        >
          AA {wcagAA ? "✓" : "✗"}
        </span>
        <span
          className={`${styles.badge} ${
            wcagAALarge ? styles.badgePass : styles.badgeFail
          }`}
          title="WCAG 2.1 AA — large text / UI components (3:1)"
        >
          AA Large {wcagAALarge ? "✓" : "✗"}
        </span>
        {!wcagAA && (
          <p className={styles.contrastWarning}>
            ⚠️ This colour may be hard to read for some users. Consider choosing
            a darker shade.
          </p>
        )}
      </div>

      {/* ── Preview chip ────────────────────────────────────────────── */}
      <div className={styles.preview}>
        <span
          className={styles.previewButton}
          style={{ backgroundColor: value, color: "#ffffff" }}
          aria-hidden="true"
        >
          Preview button
        </span>
        <span
          className={styles.previewFocus}
          style={{
            outline: `2px solid ${value}`,
            outlineOffset: 2,
          }}
          aria-hidden="true"
        >
          Focus ring
        </span>
      </div>

      {/* ── Save error feedback ──────────────────────────────────────── */}
      {saveError && (
        <p className={styles.errorText} role="alert">
          Could not save your preference: {saveError}
        </p>
      )}

      {/* ── Actions ─────────────────────────────────────────────────── */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.resetButton}
          onClick={handleReset}
          disabled={disabled || value === DEFAULT_ACCENT_COLOR}
        >
          Reset to default
        </button>
        <button
          type="button"
          className={styles.saveButton}
          onClick={handleSave}
          disabled={disabled || isSaving || !!inputError}
          aria-busy={isSaving}
        >
          {isSaving ? "Saving…" : "Save colour"}
        </button>
      </div>
    </div>
  );
};

export default AccentColorPicker;
