'use client';

import React, { useEffect, useId, useState } from 'react';
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

  // Sync pending and freePickValue if the external value prop changes.
  useEffect(() => {
    setPending(current);
    setFreePickValue(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Short-form (#rgb) and alpha (#rrggbbaa) are intentionally unsupported
    // because <input type="color"> always emits 6-digit values and the
    // palette exclusively uses 6-digit values.
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

  return (
    <div className="accent-color-picker" aria-label="Accent colour picker">
      <style>{`
        .accent-color-picker {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-width: 420px;
        }
        .acp-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin: 0;
        }
        .acp-swatches {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .acp-swatch {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 3px solid transparent;
          cursor: pointer;
          transition: transform 0.1s ease, border-color 0.1s ease;
          outline: none;
          padding: 0;
        }
        .acp-swatch:hover:not(:disabled) {
          transform: scale(1.15);
        }
        .acp-swatch:focus-visible {
          outline: 2px solid var(--color-accent, ${DEFAULT_ACCENT_COLOR});
          outline-offset: 2px;
        }
        .acp-swatch--selected {
          border-color: #1f2937;
          transform: scale(1.1);
        }
        .acp-swatch:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
        .acp-advanced-toggle {
          background: none;
          border: none;
          padding: 0;
          color: var(--color-accent, ${DEFAULT_ACCENT_COLOR});
          font-size: 0.8125rem;
          cursor: pointer;
          text-decoration: underline;
          text-align: left;
          width: fit-content;
        }
        .acp-advanced-toggle:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .acp-free-pick {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .acp-free-pick input[type="color"] {
          width: 44px;
          height: 36px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          cursor: pointer;
          padding: 2px;
          background: white;
        }
        .acp-free-pick-hex {
          font-family: monospace;
          font-size: 0.875rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 6px 10px;
          width: 110px;
          outline: none;
        }
        .acp-free-pick-hex:focus {
          border-color: var(--color-accent, ${DEFAULT_ACCENT_COLOR});
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent, ${DEFAULT_ACCENT_COLOR}) 25%, transparent);
        }
        .acp-contrast-badge {
          font-size: 0.75rem;
          padding: 3px 8px;
          border-radius: 9999px;
          font-weight: 600;
        }
        .acp-contrast-pass {
          background: #dcfce7;
          color: #166534;
        }
        .acp-contrast-fail {
          background: #fee2e2;
          color: #991b1b;
        }
        .acp-contrast-warning {
          font-size: 0.75rem;
          color: #92400e;
          background: #fef3c7;
          padding: 6px 10px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .acp-preview {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }
        .acp-preview-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .acp-preview-btn {
          font-size: 0.8125rem;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 6px;
          border: none;
          cursor: default;
          color: white;
        }
        .acp-preview-text {
          font-size: 0.8125rem;
          color: #374151;
        }
        .acp-actions {
          display: flex;
          gap: 8px;
        }
        .acp-save-btn {
          font-size: 0.875rem;
          font-weight: 600;
          padding: 8px 20px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          color: white;
          transition: opacity 0.15s ease;
        }
        .acp-save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .acp-cancel-btn {
          font-size: 0.875rem;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          background: white;
          cursor: pointer;
          color: #374151;
          transition: background 0.15s ease;
        }
        .acp-cancel-btn:hover:not(:disabled) {
          background: #f3f4f6;
        }
        .acp-cancel-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>

      <p className="acp-label">Accent Colour</p>

      {/* Palette swatches */}
      <div className="acp-swatches" role="listbox" aria-label="Colour palette">
        {ACCENT_COLOR_PALETTE.map((swatch) => (
          <button
            key={swatch.value}
            type="button"
            role="option"
            aria-selected={pending === swatch.value}
            aria-label={swatch.label}
            title={swatch.label}
            className={`acp-swatch${
              pending === swatch.value ? ' acp-swatch--selected' : ''
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
        className="acp-advanced-toggle"
        onClick={() => setShowAdvanced((v) => !v)}
        disabled={disabled}
        aria-expanded={showAdvanced}
      >
        {showAdvanced ? '▲ Hide custom colour' : '▼ Choose custom colour'}
      </button>

      {showAdvanced && (
        <div className="acp-free-pick">
          <input
            id={`${instanceId}-color`}
            type="color"
            value={freePickValue}
            onChange={(e) => {
              setFreePickValue(e.target.value);
              setPending(e.target.value);
            }}
            disabled={disabled}
            aria-label="Custom colour picker"
          />
          <input
            type="text"
            className="acp-free-pick-hex"
            value={freePickValue}
            onChange={handleFreePickChange}
            maxLength={7}
            placeholder="#6366f1"
            aria-label="Hex colour value"
            disabled={disabled}
          />
          {info && (
            <span
              className={`acp-contrast-badge ${
                info.passes ? 'acp-contrast-pass' : 'acp-contrast-fail'
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
        <div className="acp-contrast-warning" role="alert">
          <span aria-hidden="true">⚠️</span>
          This colour ({info.ratio}:1) may not meet WCAG AA contrast (4.5:1)
          against white backgrounds.
        </div>
      )}

      {/* Preview */}
      <div className="acp-preview">
        <span
          className="acp-preview-dot"
          style={{ backgroundColor: pending }}
          aria-hidden="true"
        />
        <span
          className="acp-preview-btn"
          style={{ backgroundColor: pending }}
          aria-hidden="true"
        >
          Button
        </span>
        <span className="acp-preview-text">
          Preview of your accent colour
        </span>
      </div>

      {/* Actions */}
      <div className="acp-actions">
        <button
          type="button"
          className="acp-save-btn"
          style={{ backgroundColor: pending }}
          onClick={handleSave}
          disabled={!isDirty || saving || disabled || !isValidHex(pending)}
        >
          {saving ? 'Saving…' : 'Save colour'}
        </button>
        {isDirty && (
          <button
            type="button"
            className="acp-cancel-btn"
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
