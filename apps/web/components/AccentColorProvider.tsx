"use client";

import React, { useEffect } from "react";
import {
  applyAccentColor,
  DEFAULT_ACCENT_COLOR,
  isValidHex,
} from "../lib/accentColor";

export interface AccentColorProviderProps {
  /** Server-persisted preference, passed down from a session/user context */
  accentColor?: string | null;
  children: React.ReactNode;
}

/**
 * AccentColorProvider
 *
 * Applies the user's server-persisted accent colour on mount so that
 * the page renders with the correct colour without a flash.
 * Should be placed high in the component tree (e.g. inside the root layout).
 *
 * Example usage in `apps/web/app/layout.tsx`:
 * ```tsx
 * import { AccentColorProvider } from "../components/AccentColorProvider";
 *
 * export default async function RootLayout({ children }) {
 *   const session = await getServerSession();
 *   const accentColor = session?.user?.accentColor ?? null;
 *   return (
 *     <html lang="en">
 *       <body>
 *         <AccentColorProvider accentColor={accentColor}>
 *           {children}
 *         </AccentColorProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function AccentColorProvider({
  accentColor,
  children,
}: AccentColorProviderProps) {
  useEffect(() => {
    const colour =
      accentColor && isValidHex(accentColor)
        ? accentColor
        : DEFAULT_ACCENT_COLOR;
    applyAccentColor(colour);
  }, [accentColor]);

  return <>{children}</>;
}
