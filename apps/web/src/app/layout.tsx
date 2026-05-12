import type { Metadata } from "next";
import "./globals.css";
import "../accent-color.css";
import { AccentColorProvider } from "../components/AccentColorProvider";

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
        <AccentColorProvider featureEnabled={true}>
          {children}
        </AccentColorProvider>
      </body>
    </html>
  );
}
