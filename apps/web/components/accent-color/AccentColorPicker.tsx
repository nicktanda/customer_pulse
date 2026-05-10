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
  const { accentColor, setAccentColor, resetAccentColor } = useAccentColor();
  const [showFree, setShowFree] = useState(false);
  const [freeInput, setFreeInput] = useState("");
  const [freeError, setFreeError] = useState("");
  const freeLabelId = useId();

  function handleSwatchClick(hex: string) {
    setAccentColor(hex);
    setShowFree(false);
    setFreeError("");
  }

  function handleFreeInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setFreeInput(value);
    setFreeError("");
  }

  function handleFreeApply() {
    const hex = freeInput.startsWith("#") ? freeInput : `#${freeInput}`;
    if (!isValidHex(hex)) {
      setFreeError("Please enter a valid 6-digit hex colour (e.g. #3B82F6).");
      return;
    }
    if (!isWcagAA(hex)) {
      const ratio = contrastRatio(hex)?.toFixed(2) ?? "?";
      setFreeError(
        `This colour has a contrast ratio of ${ratio}:1 against white, which is below the WCAG AA minimum of 4.5:1. Text may be hard to read.`
      );
      // Still allow applying – just warn.
    } else {
      setFreeError("");
    }
    setAccentColor(hex);
  }

  function handleFreeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleFreeApply();
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
      <div className={styles.palette} role="radiogroup" aria-label="Accent colour palette">
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
              className={`${styles.swatch} ${isSelected ? styles.swatchSelected : ""}`}
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
          {/* Native colour picker */}
          <input
            type="color"
            value={accentColor}
            onChange={(e) => {
              setFreeInput(e.target.value);
              setAccentColor(e.target.value);
            }}
            className={styles.nativePicker}
            aria-label="Pick a custom accent colour"
          />

          {/* Hex text input */}
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
              maxLength={7}
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
        </div>
      )}
    </div>
  );
}
