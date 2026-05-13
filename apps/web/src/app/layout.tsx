import type { Metadata } from "next";
import "./styles/accent-colour.css";
import { AccentColourInitializer } from "./components/AccentColourInitializer";

export const metadata: Metadata = {
  title: "Customer Pulse",
  description: "Customer Pulse — your feedback intelligence platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AccentColourInitializer />
        {children}
      </body>
    </html>
  );
}
