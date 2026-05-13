import type { Metadata } from "next";
import "./globals.css";
import "./styles/accent-colour.css";
import { Providers } from "./providers";
import { AccentColourInitializer } from "./components/AccentColourInitializer";

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
        {/*
          AccentColourInitializer reads the stored accent colour from
          localStorage on first render and applies it to :root so the
          correct --colour-accent token is active before interactive
          components paint.
        */}
        <AccentColourInitializer />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
