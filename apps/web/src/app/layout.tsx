import type { Metadata } from "next";
import { Orbitron } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { THEME_STORAGE_KEY } from "@/components/theme-storage";

/** Wide geometric display type — aligns with the Kairos brand kit wordmark. */
const kairosDisplay = Orbitron({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-kairos-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kairos",
  description:
    "Kairos (kairos.ai) — customer feedback intelligence: decide, act, accelerate. Integrations, AI triage, and daily digests.",
};

/**
 * Bootstrap reads `data-bs-theme` on the root element (`<html>`) to swap light/dark palettes.
 * This tiny script runs immediately (in `<head>`) so the first paint already matches the user’s choice.
 *
 * Kairos is **dark-first**: if there is no saved preference yet, we default to dark (brand kit).
 * Saved values from `ThemeToggle` use the same localStorage key as `theme-storage.ts` — keep them aligned.
 */
const themeBootstrapInline = `
(function(){
  try {
    var k = ${JSON.stringify(THEME_STORAGE_KEY)};
    var v = localStorage.getItem(k);
    var dark = true;
    if (v === 'light') dark = false;
    else if (v === 'dark') dark = true;
    else if (v === 'auto') dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    else dark = true;
    document.documentElement.setAttribute('data-bs-theme', dark ? 'dark' : 'light');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the inline theme script sets `data-bs-theme` before React runs; the value still matches after hydration.
    <html lang="en" className={kairosDisplay.variable} suppressHydrationWarning>
      <head>
        {/*
          suppressHydrationWarning: some browser extensions inject or rewrite <head> scripts
          (e.g. location spoofers) before React hydrates, so the DOM node may not match SSR.
          The inline theme bootstrap is still correct; we only silence the unavoidable mismatch.
        */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeBootstrapInline }}
        />
      </head>
      <body className="min-vh-100 antialiased bg-body text-body">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
