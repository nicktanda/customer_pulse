import type { Metadata } from "next";
import "./globals.css";
import { AccentColorProvider } from "./contexts/accent-color-context";

export const metadata: Metadata = {
  title: "App",
  description: "App",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AccentColorProvider>{children}</AccentColorProvider>
      </body>
    </html>
  );
}
