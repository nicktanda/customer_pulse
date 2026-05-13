import type { Metadata } from "next";
import "./globals.css";
import "./accent-colour.css";
import { Providers } from "./providers";
import AccentColourProvider from "./components/AccentColourProvider";

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
          <AccentColourProvider>{children}</AccentColourProvider>
        </Providers>
      </body>
    </html>
  );
}
