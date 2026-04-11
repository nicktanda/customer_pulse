"use client";

import { SessionProvider } from "next-auth/react";

/** Lets client components (e.g. login form) call `signIn` / `signOut`. */
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
