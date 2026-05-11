'use client';

import React, { useEffect, useId, useState } from 'react';
import styles from './accent-color-picker.module.css';
import {
  ACCENT_COLOR_PALETTE,
  DEFAULT_ACCENT_COLOR,
  contrastRatio,
  isValidHex,
  passesWcagAA,
} from '@/lib/accent-color';

interface AccentColorPickerProps {
  /** Currently saved accent colour (hex string). */
  value?: string | null;
  /** Called when the user confirms a new colour selection. */
  onChange: (hex: string) => void | Promise<void>;
  disabled?: boolean;
}

function getContrastInfo(
  hex: string,
): { ratio: number; passes: boolean } | null {
  const ratio = contrastRatio(hex, '#ffffff');
  if (ratio === null) return null;
  return { ratio: Math.round(ratio * 100) / 100, passes: passesWcagAA(hex) };
}

export function AccentColorPicker({
  value,
  onChange,
  disabled = false,
}: AccentColorPickerProps) {
  const instanceId = useId();
  const current = value && isValidHex(value) ? value : DEFAULT_ACCENT_COLOR;

  const [pending, setPending] = useState<string>(current);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [freePickValue, setFreePickValue] = useState(current);
  const [saving, setSaving] = useState(false);

  // Sync pending and freePickValue when the external value prop changes.
  useEffect(() => {
    const resolved = value && isValidHex(value) ? value : DEFAULT_ACCENT_COLOR;
    setPending(resolved);
    setFreePickValue(resolved);
  }, [value]);

  const handleSwatchClick = (hex: string) => {
    if (disabled) return;
    setPending(hex);
    setFreePickValue(hex);
  };

  const handleFreePickChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFreePickValue(val);
    // isValidHex only accepts exactly 6-digit hex strings (e.g. #rrggbb).
    if (isValidHex(val)) {
      setPending(val);
    }
  };

  const handleSave = async () => {
    if (!isValidHex(pending) || saving || disabled) return;
    setSaving(true);
    try {
      await onChange(pending);
    } finally {
      setSaving(false);
    }
  };

  const info = getContrastInfo(pending);
  const isDirty = pending !== current;

  // Ensure the color input always receives a valid 6-digit hex value.
  const colorInputValue = isValidHex(freePickValue) ? freePickValue : current;

  return (
    <div className={styles.accentColorPicker} aria-label="Accent colour picker">
      <p className={styles.label}>Accent Colour</p>

      {/* Palette swatches — radiogroup/radio matches single-select semantics */}
      <div
        className={styles.swatches}
        role="radiogroup"
        aria-label="Colour palette"
      >
        {ACCENT_COLOR_PALETTE.map((swatch) => (
          <button
            key={swatch.value}
            type="button"
            role="radio"
            aria-checked={pending === swatch.value}
            aria-label={swatch.label}
            title={swatch.label}
            className={`${styles.swatch}${
              pending === swatch.value ? ` ${styles.swatchSelected}` : ''
            }`}
            style={{ backgroundColor: swatch.value }}
            onClick={() => handleSwatchClick(swatch.value)}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Advanced free-pick toggle */}
      <button
        type="button"
        className={styles.advancedToggle}
        onClick={() => setShowAdvanced((v) => !v)}
        disabled={disabled}
        aria-expanded={showAdvanced}
      >
        {showAdvanced ? '▲ Hide custom colour' : '▼ Choose custom colour'}
      </button>

      {showAdvanced && (
        <div className={styles.freePick}>
          <input
            id={`${instanceId}-color`}
            type="color"
            value={colorInputValue}
            onChange={(e) => {
              const val = e.target.value;
              setFreePickValue(val);
              setPending(val);
            }}
            disabled={disabled}
            aria-label="Custom colour picker"
          />
          <input
            type="text"
            className={styles.freePickHex}
            value={freePickValue}
            onChange={handleFreePickChange}
            maxLength={7}
            placeholder="#6366f1"
            aria-label="Hex colour value"
            disabled={disabled}
          />
          {info && (
            <span
              className={`${styles.contrastBadge} ${
                info.passes ? styles.contrastPass : styles.contrastFail
              }`}
              title={`Contrast ratio ${info.ratio}:1`}
            >
              {info.ratio}:1
            </span>
          )}
        </div>
      )}

      {/* WCAG warning */}
      {info && !info.passes && (
        <div className={styles.contrastWarning} role="alert">
          <span aria-hidden="true">⚠️</span>
          This colour ({info.ratio}:1) may not meet WCAG AA contrast (4.5:1)
          against white backgrounds.
        </div>
      )}

      {/* Preview */}
      <div className={styles.preview}>
        <span
          className={styles.previewDot}
          style={{ backgroundColor: pending }}
          aria-hidden="true"
        />
        <span
          className={styles.previewBtn}
          style={{ backgroundColor: pending }}
          aria-hidden="true"
        >
          Button
        </span>
        <span className={styles.previewText}>
          Preview of your accent colour
        </span>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.saveBtn}
          style={{ backgroundColor: pending }}
          onClick={handleSave}
          disabled={!isDirty || saving || disabled || !isValidHex(pending)}
        >
          {saving ? 'Saving…' : 'Save colour'}
        </button>
        {isDirty && (
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() => {
              setPending(current);
              setFreePickValue(current);
            }}
            disabled={saving || disabled}
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
