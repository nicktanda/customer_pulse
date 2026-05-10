"use client";

import React, { useTransition } from "react";
import { AccentColorPicker } from "./AccentColorPicker";
import { isFeatureEnabled } from "../lib/featureFlags";

export interface AccentColorPickerSectionProps {
  /** Current persisted accent colour for this user */
  currentAccentColor?: string | null;
  /**
   * Server action / mutation to persist the colour.
   * Return undefined on success, or an error message string on failure.
   */
  onSave: (hex: string) => Promise<{ error?: string } | void>;
}

/**
 * AccentColorPickerSection
 *
 * Wraps the AccentColorPicker with save-to-server logic and a feature flag
 * guard. Drop this into a profile settings page.
 */
export function AccentColorPickerSection({
  currentAccentColor,
  onSave,
}: AccentColorPickerSectionProps) {
  // ⚠️  Rules of Hooks: all hooks MUST be declared before any conditional
  // return. `isFeatureEnabled` reads a build-time constant and is therefore
  // safe to call after the hooks below, but the early-return MUST stay after
  // all hook calls to avoid violating the Rules of Hooks.
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [savedColor, setSavedColor] = React.useState<string | null>(null);

  // Feature flag check — placed after hooks to satisfy the Rules of Hooks.
  if (!isFeatureEnabled("accentColorPicker")) return null;

  function handleChange(hex: string) {
    setSaveError(null);
    setSavedColor(null);
    startTransition(async () => {
      const result = await onSave(hex);
      if (result?.error) {
        setSaveError(result.error);
      } else {
        setSavedColor(hex);
      }
    });
  }

  return (
    <section
      aria-labelledby="accent-color-heading"
      className="accent-color-section"
    >
      <h2 id="accent-color-heading" className="accent-color-section__heading">
        Accent colour
      </h2>
      <p className="accent-color-section__description">
        Personalise the highlight and button colour used throughout the app.
      </p>

      <AccentColorPicker
        initialValue={currentAccentColor}
        onChange={handleChange}
      />

      <div className="accent-color-section__status" aria-live="polite">
        {isPending && (
          <span className="accent-color-section__saving">Saving…</span>
        )}
        {!isPending && savedColor && (
          <span className="accent-color-section__saved">✓ Saved</span>
        )}
        {!isPending && saveError && (
          <span className="accent-color-section__error">⚠ {saveError}</span>
        )}
      </div>
    </section>
  );
}
