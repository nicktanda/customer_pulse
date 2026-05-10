/**
 * AccentColorSettings
 *
 * A ready-to-drop-in settings panel section that lets the user choose their
 * accent colour. Intended to be embedded in a Profile / Appearance settings
 * page.
 *
 * Usage:
 *   import { AccentColorSettings } from "@/AccentColorSettings";
 *   ...
 *   <AccentColorSettings />
 *
 * Optionally pass `onSave` to persist the choice to the server:
 *   <AccentColorSettings onSave={async (hex) => { await updateProfile({ accentColor: hex }); }} />
 */

"use client";

import React, { useState, useTransition } from "react";
import { AccentColorPicker } from "./AccentColorPicker";
import { useAccentColorContext } from "./AccentColorProvider";
import { ACCENT_COLOR_FLAG } from "./useAccentColor";

export interface AccentColorSettingsProps {
  /**
   * Called after the user confirms their choice.
   * Use this to persist the value to the database.
   */
  onSave?: (hex: string) => Promise<void>;
  className?: string;
}

export function AccentColorSettings({
  onSave,
  className = "",
}: AccentColorSettingsProps) {
  const { accentColor, setAccentColor, reset, passesContrast, enabled } =
    useAccentColorContext();

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!enabled) return null;

  const handleSave = () => {
    if (!onSave) return;
    setSaveError(null);
    setSaveSuccess(false);
    startTransition(async () => {
      try {
        await onSave(accentColor);
        setSaveSuccess(true);
      } catch (err) {
        setSaveError(
          err instanceof Error ? err.message : "Failed to save. Please try again."
        );
      }
    });
  };

  return (
    <section
      className={`accent-color-settings ${className}`}
      aria-labelledby="accent-color-settings-heading"
    >
      <h3
        id="accent-color-settings-heading"
        className="accent-color-settings__heading"
      >
        Accent colour
      </h3>
      <p className="accent-color-settings__description">
        Choose a highlight colour for buttons, active states, and focus rings
        across the interface.
      </p>

      <AccentColorPicker
        value={accentColor}
        onChange={setAccentColor}
        onReset={reset}
        passesContrast={passesContrast}
      />

      {/* Save to server (optional) */}
      {onSave && (
        <div className="accent-color-settings__actions">
          <button
            type="button"
            className="btn-primary accent-color-settings__save-btn"
            onClick={handleSave}
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? "Saving…" : "Save preference"}
          </button>

          {saveSuccess && (
            <span
              className="accent-color-settings__feedback accent-color-settings__feedback--success"
              role="status"
            >
              ✓ Saved
            </span>
          )}

          {saveError && (
            <span
              className="accent-color-settings__feedback accent-color-settings__feedback--error"
              role="alert"
            >
              {saveError}
            </span>
          )}
        </div>
      )}
    </section>
  );
}

export default AccentColorSettings;
