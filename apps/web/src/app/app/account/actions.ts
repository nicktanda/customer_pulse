"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { users } from "@customer-pulse/db/client";

async function requireUserId(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return Number(session.user.id);
}

export async function updateProfileAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!name || !email) {
    redirect("/app/account?error=Name and email are required.");
  }

  const db = getDb();

  // Check if email is taken by another user
  const [conflict] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${email} AND ${users.id} != ${userId}`)
    .limit(1);
  if (conflict) {
    redirect("/app/account?error=That email is already in use.");
  }

  await db
    .update(users)
    .set({ name, email, updatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidatePath("/app/account");
  redirect("/app/account?success=profile");
}

export async function changePasswordAction(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const userId = await requireUserId();
  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match." };
  }

  const db = getDb();
  const [user] = await db
    .select({ id: users.id, encryptedPassword: users.encryptedPassword })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    redirect("/login");
  }

  const bcrypt = (await import("bcryptjs")).default;
  const ok = await bcrypt.compare(currentPassword, user.encryptedPassword);
  if (!ok) {
    return { error: "Current password is incorrect." };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await db
    .update(users)
    .set({ encryptedPassword: hashedPassword, updatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidatePath("/app/account");
  redirect("/app/account?success=password");
}
