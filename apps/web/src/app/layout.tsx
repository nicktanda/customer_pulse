import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "./providers";
import { AccentColorInit } from "./components/AccentColorInit";
import "./styles/accent-color.css";

export const metadata: Metadata = {
  title: "xenoform.ai",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    // data-bs-theme is fixed to dark; xenoform.ai is a single-theme app.
    <html lang="en" data-bs-theme="dark">
      <body className="min-vh-100 antialiased bg-body text-body">
        <AccentColorInit />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
