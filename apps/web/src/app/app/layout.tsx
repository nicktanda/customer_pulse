import React from "react";
import AccentColourProvider from "@/app/components/AccentColourProvider";
import "@/app/accent-colour.css";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccentColourProvider>
      {children}
    </AccentColourProvider>
  );
}
