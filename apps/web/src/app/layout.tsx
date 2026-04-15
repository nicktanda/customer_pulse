import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { THEME_STORAGE_KEY } from "@/components/theme-storage";

export const metadata: Metadata = {
  title: "Customer Pulse",
  description: "Customer feedback intelligence (Next.js stack)",
};

/**
 * Bootstrap reads `data-bs-theme` on the root element (`<html>`) to swap light/dark palettes.
 * This tiny script runs immediately (in <head>) so the correct theme is applied before the page paints.
 * It must stay in sync with `ThemeToggle` + `theme-storage.ts` (same localStorage key and rules).
 */
const themeBootstrapInline = `
(function(){
  try {
    var k = ${JSON.stringify(THEME_STORAGE_KEY)};
    var v = localStorage.getItem(k);
    var dark = false;
    if (v === 'dark') dark = true;
    else if (v === 'light') dark = false;
    else dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
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
    <html lang="en" suppressHydrationWarning>
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
