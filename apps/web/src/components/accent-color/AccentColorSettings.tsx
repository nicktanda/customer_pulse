"use client";

import React, { useState } from "react";
import { AccentColorPicker, DEFAULT_ACCENT } from "./AccentColorPicker";
import { useAccentColor } from "./AccentColorProvider";

interface AccentColorSettingsProps {
  /** Called when user saves their preference (wire up to your API) */
  onSave?: (color: string) => Promise<void>;
}

export function AccentColorSettings({ onSave }: AccentColorSettingsProps) {
  const { accentColor, setAccentColor, isFeatureEnabled } = useAccentColor();
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localColor, setLocalColor] = useState(accentColor);

  if (!isFeatureEnabled) {
    return null;
  }

  async function handleSave() {
    setPending(true);
    setSaved(false);
    setError(null);
    try {
      setAccentColor(localColor);
      if (onSave) {
        await onSave(localColor);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError("Failed to save preference. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function handleReset() {
    setLocalColor(DEFAULT_ACCENT);
    setAccentColor(DEFAULT_ACCENT);
    if (onSave) {
      onSave(DEFAULT_ACCENT).catch(() => undefined);
    }
  }

  return (
    <section
      className="accent-settings"
      aria-labelledby="accent-settings-heading"
    >
      <h3 id="accent-settings-heading" className="accent-settings__heading">
        Accent Colour
      </h3>
      <p className="accent-settings__description">
        Choose an accent colour used for highlights, buttons, and active states
        across the app.
      </p>

      <div className="accent-settings__preview">
        <span
          className="accent-settings__preview-label">Preview:&nbsp;</span>
        <button
          type="button"
          className="accent-settings__preview-btn"
          style={{
            background: localColor,
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "6px 16px",
            fontWeight: 600,
            cursor: "default",
            fontSize: "0.875rem",
          }}
          tabIndex={-1}
          aria-hidden
        >
          Primary Button
        </button>
        <span
          className="accent-settings__preview-link"
          style={{ color: localColor, textDecoration: "underline", fontSize: "0.875rem" }}
        >
          Active link
        </span>
      </div>

      <AccentColorPicker
        value={localColor}
        onChange={setLocalColor}
        disabled={pending}
      />

      <div className="accent-settings__actions">
        <button
          type="button"
          className="accent-settings__save-btn"
          onClick={handleSave}
          disabled={pending || localColor === accentColor}
          style={{
            background: localColor,
            color: "#fff",
          }}
        >
          {pending ? "Saving…" : "Save preference"}
        </button>

        <button
          type="button"
          className="accent-settings__reset-btn"
          onClick={handleReset}
          disabled={pending}
        >
          Reset to default
        </button>
      </div>

      {saved && (
        <p className="accent-settings__success" role="status">
          ✓ Accent colour saved.
        </p>
      )}
      {error && (
        <p className="accent-settings__error" role="alert">
          {error}
        </p>
      )}

      <style>{`
        .accent-settings {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-width: 480px;
        }
        .accent-settings__heading {
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
          color: #111827;
        }
        .accent-settings__description {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
        }
        .accent-settings__preview {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }
        .accent-settings__preview-label {
          font-size: 0.8125rem;
          color: #6b7280;
        }
        .accent-settings__actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .accent-settings__save-btn {
          border: none;
          border-radius: 6px;
          padding: 8px 20px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .accent-settings__save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .accent-settings__reset-btn {
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 8px 20px;
          font-size: 0.875rem;
          background: #fff;
          color: #374151;
          cursor: pointer;
          transition: background 0.15s;
        }
        .accent-settings__reset-btn:hover:not(:disabled) {
          background: #f3f4f6;
        }
        .accent-settings__reset-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .accent-settings__success {
          font-size: 0.875rem;
          color: #065f46;
          background: #d1fae5;
          border: 1px solid #6ee7b7;
          border-radius: 6px;
          padding: 8px 12px;
          margin: 0;
        }
        .accent-settings__error {
          font-size: 0.875rem;
          color: #991b1b;
          background: #fee2e2;
          border: 1px solid #fca5a5;
          border-radius: 6px;
          padding: 8px 12px;
          margin: 0;
        }
      `}</style>
    </section>
  );
}
