"use client";

import { useAccentColor } from "./AccentColorProvider";
import { AccentColorPicker } from "./AccentColorPicker";

/**
 * A settings panel section that exposes the accent colour picker.
 * Drop this into your existing profile/settings page.
 *
 * Usage:
 *   import { AccentColorSettings } from "@/app/components/AccentColorSettings";
 *   <AccentColorSettings />
 */
export function AccentColorSettings() {
  const { isEnabled } = useAccentColor();

  if (!isEnabled) {
    return null;
  }

  return (
    <section
      className="accent-color-settings"
      aria-labelledby="accent-settings-heading"
    >
      <h2 id="accent-settings-heading" className="accent-color-settings__heading">
        Appearance
      </h2>
      <p className="accent-color-settings__subheading">
        Choose an accent colour to personalise your experience.
      </p>
      <AccentColorPicker />
    </section>
  );
}
