import type { ReactNode } from "react";
import { AccentColorInit } from "./components/AccentColorInit";
import "./styles/accent-color.css";

export const metadata = {
  title: "App",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AccentColorInit />
        {children}
      </body>
    </html>
  );
}
