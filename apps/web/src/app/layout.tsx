import type { Metadata } from "next";
import "./globals.css";
import "./accent-colour.css";
import { Providers } from "./providers";
import AccentColourProvider from "./components/AccentColourProvider";

export const metadata: Metadata = {
  title: {
    template: "%s | CustomerPulse",
    default: "CustomerPulse",
  },
  description: "Customer feedback management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // data-bs-theme is fixed to dark; this is a single-theme app.
    <html lang="en" data-bs-theme="dark">
      <body className="min-vh-100 antialiased bg-body text-body">
        <Providers>
          {/*
           * AccentColourProvider must be a client component nested inside Providers
           * so that session/auth context is available. It reads localStorage on
           * mount and sets data-accent on <html> — a brief flash of the default
           * (indigo) accent is expected on first load for users who picked a
           * different colour; this is the standard SSR-safe trade-off.
           */}
          <AccentColourProvider>{children}</AccentColourProvider>
        </Providers>
      </body>
    </html>
  );
}
