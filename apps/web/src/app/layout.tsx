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
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-bs-theme="dark">
      <body className="min-vh-100 antialiased bg-body text-body">
        <AccentColourProvider>
          <Providers>{children}</Providers>
        </AccentColourProvider>
      </body>
    </html>
  );
}
