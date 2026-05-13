import type { Metadata } from "next";
import { AccentColorProvider } from "./contexts/accent-color-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "App",
  description: "Your application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AccentColorProvider>{children}</AccentColorProvider>
      </body>
    </html>
  );
}
