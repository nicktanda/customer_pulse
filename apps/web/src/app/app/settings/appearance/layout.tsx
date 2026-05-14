import React from "react";
import { AccentColourInit } from "@/components/accent-colour/AccentColourInit";

export default function AppearanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AccentColourInit>{children}</AccentColourInit>;
}
