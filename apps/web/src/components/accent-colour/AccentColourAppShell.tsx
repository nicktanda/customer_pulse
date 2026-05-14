/**
 * AccentColourAppShell
 *
 * A thin server component that:
 * 1. Reads the accent colour from the request cookie.
 * 2. Renders <AccentColourInit> (inline script for flash-free load).
 * 3. Wraps children in <AccentColourProvider> (client-side hydration).
 *
 * Mount this in apps/web/src/app/app/layout.tsx so the accent colour
 * is applied across the entire authenticated app shell.
 */
import { cookies } from "next/headers";
import { ACCENT_COLOUR_STORAGE_KEY } from "@/components/accent-colour/accent-colours";
import { AccentColourInit } from "@/components/accent-colour/AccentColourInit";
import { AccentColourProvider } from "@/components/accent-colour/AccentColourProvider";
import "@/components/accent-colour/accent-colour.css";

export async function AccentColourAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const colourId = cookieStore.get(ACCENT_COLOUR_STORAGE_KEY)?.value ?? "blue";

  return (
    <>
      <AccentColourInit />
      <AccentColourProvider serverColourId={colourId}>
        {children}
      </AccentColourProvider>
    </>
  );
}
