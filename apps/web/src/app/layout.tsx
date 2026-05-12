import type { ReactNode } from "react";
import { AccentColorProvider } from "./components/AccentColorProvider";
import "./styles/accent-color.css";

export const metadata = {
  title: "App",
  description: "App",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AccentColorProvider>{children}</AccentColorProvider>
      </body>
    </html>
  );
}
