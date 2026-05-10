"use client";

import { useEffect } from "react";
import {
  applyAccentColor,
  ACCENT_COLOR_STORAGE_KEY,
  DEFAULT_ACCENT_COLOR,
} from "../lib/accent-color";

/**
 * Thin client component that applies the accent colour CSS variables
 * as early as possible to avoid a flash of unstyled content.
 *
 * Place this component near the root of your layout (inside <body>).
 */
export function AccentColorProvider({
  accentColor,
}: {
  accentColor?: string | null;
}) {
  const color = accentColor || DEFAULT_ACCENT_COLOR;

  useEffect(() => {
    applyAccentColor(color);
  }, [color]);

  // Inline script ensures the colour is set before first paint
  // even before React hydration completes.
  // ACCENT_COLOR_STORAGE_KEY is embedded via JSON.stringify so the
  // key stays in sync with the constant in accent-color.ts.
  const initScript = `
    (function() {
      try {
        var stored = localStorage.getItem(${JSON.stringify(ACCENT_COLOR_STORAGE_KEY)});
        var color = stored || ${JSON.stringify(color)};
        document.documentElement.style.setProperty('--color-accent', color);
      } catch(e) {}
    })();
  `.trim();

  return (
    <script
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: initScript }}
    />
  );
}
