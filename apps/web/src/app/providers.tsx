"use client";

import { SessionProvider } from "next-auth/react";
import { AccentColourProvider } from "@/components/ui/AccentColourProvider";

/** Lets client components (e.g. login form) call `signIn` / `signOut`. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AccentColourProvider>{children}</AccentColourProvider>
    </SessionProvider>
  );
}
