import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { getAccentInitScript } from "./lib/accent-init-script";

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
      <head>
        {/* Inject accent colour before first paint to prevent FOUC */}
        <script dangerouslySetInnerHTML={{ __html: getAccentInitScript() }} />
      </head>
      <body className="min-vh-100 antialiased bg-body text-body">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
