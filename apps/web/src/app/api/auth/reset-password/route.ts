import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@customer-pulse/db/client";

const schema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

const TOKEN_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Validation failed" }, { status: 422 });
  }

  const { token, password } = parsed.data;
  const db = getDb();

  const [user] = await db
    .select({ id: users.id, resetPasswordSentAt: users.resetPasswordSentAt })
    .from(users)
    .where(eq(users.resetPasswordToken, token))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
  }

  // Check token expiry
  if (user.resetPasswordSentAt) {
    const elapsed = Date.now() - user.resetPasswordSentAt.getTime();
    if (elapsed > TOKEN_EXPIRY_MS) {
      return NextResponse.json({ error: "Reset link has expired. Please request a new one." }, { status: 400 });
    }
  }

  const bcrypt = (await import("bcryptjs")).default;
  const hashedPassword = await bcrypt.hash(password, 10);
  const now = new Date();

  await db
    .update(users)
    .set({
      encryptedPassword: hashedPassword,
      resetPasswordToken: null,
      resetPasswordSentAt: null,
      updatedAt: now,
    })
    .where(eq(users.id, user.id));

  return NextResponse.json({ ok: true });
}
