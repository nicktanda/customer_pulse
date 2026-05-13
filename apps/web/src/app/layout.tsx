import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { AccentColorProvider } from "./contexts/accent-color-context";

export const metadata: Metadata = {
  title: "xenoform.ai",
  description: "Adaptive customer feedback intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // data-bs-theme is fixed to dark; xenoform.ai is a single-theme app.
    <html lang="en" data-bs-theme="dark">
      <body className="min-vh-100 antialiased bg-body text-body">
        <Providers>
          <AccentColorProvider>{children}</AccentColorProvider>
        </Providers>
      </body>
    </html>
  );
}
