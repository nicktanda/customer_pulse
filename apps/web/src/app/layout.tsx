import type { Metadata } from "next";
import AccentColourProvider from "./components/AccentColourProvider";
import "./accent-colour.css";

export const metadata: Metadata = {
  title: "App",
  description: "",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AccentColourProvider>{children}</AccentColourProvider>
      </body>
    </html>
  );
}
