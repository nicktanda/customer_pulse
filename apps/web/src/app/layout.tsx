import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./accent-colour.css";
import AccentColourProvider from "./components/AccentColourProvider";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en">
      <body className={inter.className}>
        <AccentColourProvider>{children}</AccentColourProvider>
      </body>
    </html>
  );
}
