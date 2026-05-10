"use client";

import { useEffect } from "react";
import { applyAccentColor, DEFAULT_ACCENT_COLOR } from "../lib/accent-color";

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
  const initScript = `
    (function() {
      try {
        var stored = localStorage.getItem('user_accent_color');
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
