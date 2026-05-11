'use client';

import React, { useId, useState, useEffect } from 'react';
import {
  ACCENT_PALETTE,
  DEFAULT_ACCENT,
  passesWCAG_AA,
  contrastRatio,
  isValidHex,
} from '../lib/accentColour';

interface AccentColourPickerProps {
  value: string;
  onChange: (hex: string) => void;
  /** If true the picker is rendered but non-interactive (feature flag off). */
  disabled?: boolean;
}

export function AccentColourPicker({
  value,
  onChange,
  disabled = false,
}: AccentColourPickerProps) {
  const freePickId = useId();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [freeInput, setFreeInput] = useState(value);

  // Sync freeInput when value changes externally (e.g. palette click or context reset)
  useEffect(() => {
    setFreeInput(value);
  }, [value]);

  const passes = passesWCAG_AA(value);
  const ratio = contrastRatio(value, '#ffffff').toFixed(2);

  function handlePaletteClick(hex: string) {
    if (disabled) return;
    onChange(hex);
  }

  function handleColourInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const hex = e.target.value;
    setFreeInput(hex);
    if (isValidHex(hex)) onChange(hex);
  }

  function handleReset() {
    onChange(DEFAULT_ACCENT);
  }

  return (
    <div
      style={{
        fontFamily: 'inherit',
        maxWidth: 420,
      }}
      aria-label="Accent colour picker"
    >
      {/* Palette swatches */}
      <div
        role="radiogroup"
        aria-label="Preset accent colours"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 12,
        }}
      >
        {ACCENT_PALETTE.map((swatch) => {
          const selected = value.toLowerCase() === swatch.value.toLowerCase();
          return (
            <button
              key={swatch.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={swatch.label}
              disabled={disabled}
              onClick={() => handlePaletteClick(swatch.value)}
              onKeyDown={(e) => {
                if (disabled) return;
                const swatches = ACCENT_PALETTE.map((s) => s.value);
                const idx = swatches.indexOf(swatch.value);
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  const next = swatches[(idx + 1) % swatches.length];
                  handlePaletteClick(next);
                  (e.currentTarget.parentElement?.querySelectorAll('button')[((idx + 1) % swatches.length)] as HTMLButtonElement | undefined)?.focus();
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  const prev = swatches[(idx - 1 + swatches.length) % swatches.length];
                  handlePaletteClick(prev);
                  (e.currentTarget.parentElement?.querySelectorAll('button')[((idx - 1 + swatches.length) % swatches.length)] as HTMLButtonElement | undefined)?.focus();
                }
              }}
              title={swatch.label}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: selected
                  ? '3px solid #111827'
                  : '3px solid transparent',
                outline: selected ? '2px solid #ffffff' : 'none',
                outlineOffset: -5,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.15)',
                background: swatch.value,
                cursor: disabled ? 'not-allowed' : 'pointer',
                padding: 0,
                transition: 'transform 0.1s',
              }}
              onMouseEnter={(e) => {
                if (!disabled)
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    'scale(1.15)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  'scale(1)';
              }}
            />
          );
        })}
      </div>

      {/* Current colour preview + WCAG badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 40,
            height: 40,
            borderRadius: 6,
            background: value,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.15)',
            flexShrink: 0,
          }}
        />
        <div style={{ fontSize: 13, lineHeight: 1.4 }}>
          <span style={{ fontWeight: 600 }}>{value.toUpperCase()}</span>
          <br />
          {passes ? (
            <span
              style={{
                color: '#059669',
                fontSize: 12,
              }}
              role="status"
            >
              ✓ WCAG AA — {ratio}:1 contrast
            </span>
          ) : (
            <span
              style={{
                color: '#dc2626',
                fontSize: 12,
              }}
              role="alert"
            >
              ⚠ Low contrast ({ratio}:1) — may reduce readability
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleReset}
          disabled={disabled || value === DEFAULT_ACCENT}
          style={{
            marginLeft: 'auto',
            fontSize: 12,
            padding: '4px 8px',
            border: '1px solid #d1d5db',
            borderRadius: 4,
            background: '#f9fafb',
            cursor:
              disabled || value === DEFAULT_ACCENT ? 'not-allowed' : 'pointer',
            color: '#374151',
          }}
        >
          Reset
        </button>
      </div>

      {/* Advanced / free pick */}
      <button
        type="button"
        onClick={() => setShowAdvanced((p) => !p)}
        disabled={disabled}
        style={{
          fontSize: 13,
          color: 'var(--color-accent, #6366f1)',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: disabled ? 'not-allowed' : 'pointer',
          textDecoration: 'underline',
          marginBottom: 8,
        }}
      >
        {showAdvanced ? 'Hide' : 'Choose custom colour'}
      </button>

      {showAdvanced && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
          }}
        >
          <label htmlFor={freePickId} style={{ fontSize: 13, color: '#374151' }}>
            Pick
          </label>
          <input
            id={freePickId}
            type="color"
            value={freeInput.length === 7 ? freeInput : value}
            onChange={handleColourInputChange}
            disabled={disabled}
            style={{
              width: 36,
              height: 36,
              padding: 2,
              border: '1px solid #d1d5db',
              borderRadius: 4,
              cursor: disabled ? 'not-allowed' : 'pointer',
              background: 'white',
            }}
          />
          <input
            type="text"
            aria-label="Hex colour value"
            value={freeInput}
            onChange={handleColourInputChange}
            maxLength={7}
            disabled={disabled}
            placeholder="#6366f1"
            style={{
              fontFamily: 'monospace',
              fontSize: 13,
              width: 90,
              padding: '4px 8px',
              border: '1px solid #d1d5db',
              borderRadius: 4,
              outline: 'none',
              background: disabled ? '#f3f4f6' : 'white',
            }}
          />
          {!isValidHex(freeInput) && (
            <span style={{ fontSize: 12, color: '#dc2626' }}>
              Invalid hex
            </span>
          )}
        </div>
      )}
    </div>
  );
}
