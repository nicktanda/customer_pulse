"use server";

import { signOut } from "@/auth";

/** Server action so the sidebar can log out without a client bundle. */
export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
