"use client";

import React, { useTransition } from "react";
import { AccentColorPicker } from "./AccentColorPicker";

export interface AccentColorPickerSectionProps {
  /** Current persisted accent colour for this user */
  currentAccentColor?: string | null;
  /**
   * Server action / mutation to persist the colour.
   * Return undefined on success, or an object with an error message on failure.
   */
  onSave: (hex: string) => Promise<{ error?: string } | void>;
}

/**
 * AccentColorPickerSection
 *
 * Wraps the AccentColorPicker with save-to-server logic.
 * The feature flag guard is handled by the parent Server Component
 * (ProfileSettingsPage) so this component is only mounted when the flag is on.
 *
 * NOTE: This component is a Client Component ("use client") and receives
 * `onSave` as a prop. In Next.js App Router, passing a server action as a prop
 * to a Client Component is supported when the prop flows from a Server
 * Component — which is the case here (ProfileSettingsPage is a Server
 * Component). The server action must be defined in a file with "use server"
 * or declared inline with the "use server" directive.
 */
export function AccentColorPickerSection({
  currentAccentColor,
  onSave,
}: AccentColorPickerSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [savedColor, setSavedColor] = React.useState<string | null>(null);

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
