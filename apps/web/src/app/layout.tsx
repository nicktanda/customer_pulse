import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "./providers";
import { AccentColorProvider } from "./components/AccentColorProvider";
import "./styles/accent-color.css";

export const metadata: Metadata = {
  title: "xenoform.ai",
  description: "Adaptive customer feedback intelligence.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // data-bs-theme is fixed to dark; xenoform.ai is a single-theme dark app.
    <html lang="en" data-bs-theme="dark">
      <body className="min-vh-100 antialiased bg-body text-body">
        <Providers>
          <AccentColorProvider>{children}</AccentColorProvider>
        </Providers>
      </body>
    </html>
  );
}
