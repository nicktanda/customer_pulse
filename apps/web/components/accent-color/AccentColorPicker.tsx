"use client";

import { useId, useState } from "react";
import {
  ACCENT_PALETTE,
  DEFAULT_ACCENT_COLOR,
  isValidHex,
  isWcagAA,
  contrastRatio,
} from "@/lib/accent-color";
import { useAccentColor } from "./AccentColorProvider";
import styles from "./AccentColorPicker.module.css";

export function AccentColorPicker() {
  const { accentColor, setAccentColor, resetAccentColor, isFeatureEnabled } =
    useAccentColor();
  const [showFree, setShowFree] = useState(false);
  // Initialise freeInput from the current accentColor so it's never blank
  // when the advanced panel is opened for the first time.
  const [freeInput, setFreeInput] = useState(accentColor);
  const [freeError, setFreeError] = useState("");
  const [freeWarning, setFreeWarning] = useState("");
  const freeLabelId = useId();

  // Don't render the picker at all when the feature flag is off.
  if (!isFeatureEnabled) return null;

  function handleSwatchClick(hex: string) {
    setAccentColor(hex);
    setShowFree(false);
    setFreeError("");
    setFreeWarning("");
    // Keep the hex input in sync with the newly selected swatch colour.
    setFreeInput(hex);
  }

  function handleFreeInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setFreeInput(value);
    setFreeError("");
    setFreeWarning("");
  }

  function applyHex(rawHex: string) {
    // Normalise: add leading # if the user typed a bare 6-char hex string.
    const hex = rawHex.startsWith("#") ? rawHex : `#${rawHex}`;
    if (!isValidHex(hex)) {
      setFreeError("Please enter a valid 6-digit hex colour (e.g. #3B82F6).");
      setFreeWarning("");
      return;
    }
    setFreeError("");
    if (!isWcagAA(hex)) {
      const ratio = contrastRatio(hex)?.toFixed(2) ?? "?";
      setFreeWarning(
        `This colour has a contrast ratio of ${ratio}:1 against white, which is below the WCAG AA minimum of 4.5:1. Text may be hard to read.`
      );
    } else {
      setFreeWarning("");
    }
    setAccentColor(hex);
    // Keep the input in sync with the normalised value.
    setFreeInput(hex);
  }

  function handleFreeApply() {
    applyHex(freeInput);
  }

  function handleFreeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleFreeApply();
  }

  function handleNativePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const hex = e.target.value;
    setFreeInput(hex);
    applyHex(hex);
  }

  const isDefault = accentColor === DEFAULT_ACCENT_COLOR;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.label}>Accent colour</span>
        {!isDefault && (
          <button
            type="button"
            onClick={resetAccentColor}
            className={styles.resetBtn}
            aria-label="Reset to default accent colour"
          >
            Reset to default
          </button>
        )}
      </div>

      {/* Current preview */}
      <div className={styles.preview}>
        <span
          className={styles.previewSwatch}
          style={{ backgroundColor: accentColor }}
          aria-hidden="true"
        />
        <span className={styles.previewHex}>{accentColor.toUpperCase()}</span>
        {!isWcagAA(accentColor) && (
          <span className={styles.contrastWarn} role="alert">
            ⚠ Low contrast against white
          </span>
        )}
      </div>

      {/* Curated palette */}
      <div
        className={styles.palette}
        role="radiogroup"
        aria-label="Accent colour palette"
      >
        {ACCENT_PALETTE.map((color) => {
          const isSelected = accentColor === color.value;
          return (
            <button
              key={color.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={color.label}
              title={`${color.label} (${color.value})`}
              className={`${styles.swatch} ${
                isSelected ? styles.swatchSelected : ""
              }`}
              style={{ backgroundColor: color.value }}
              onClick={() => handleSwatchClick(color.value)}
            />
          );
        })}
      </div>

      {/* Advanced free-pick toggle */}
      <button
        type="button"
        className={styles.advancedToggle}
        onClick={() => setShowFree((v) => !v)}
        aria-expanded={showFree}
      >
        {showFree ? "▲ Hide" : "▼ Custom colour"}
      </button>

      {showFree && (
        <div className={styles.freePickRow}>
          {/* Native colour picker — runs through the same validation path */}
          <input
            type="color"
            value={accentColor}
            onChange={handleNativePickerChange}
            className={styles.nativePicker}
            aria-label="Pick a custom accent colour"
          />

          {/* Hex text input
              maxLength=8 to allow for '#' + 6 hex chars + 1 spare so the user
              can freely type with or without a leading '#' without being cut off.
              applyHex normalises the value before validation. */}
          <div className={styles.hexInputWrapper}>
            <label htmlFor={freeLabelId} className={styles.srOnly}>
              Hex colour value
            </label>
            <input
              id={freeLabelId}
              type="text"
              value={freeInput}
              onChange={handleFreeInputChange}
              onKeyDown={handleFreeKeyDown}
              placeholder="#3B82F6"
              maxLength={8}
              className={styles.hexInput}
              spellCheck={false}
            />
            <button
              type="button"
              onClick={handleFreeApply}
              className={styles.applyBtn}
            >
              Apply
            </button>
          </div>

          {freeError && (
            <p className={styles.errorMsg} role="alert">
              {freeError}
            </p>
          )}

          {/* Distinguish warnings (applied but low contrast) from errors (not applied) */}
          {freeWarning && !freeError && (
            <p className={styles.warnMsg} role="status">
              {freeWarning}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
