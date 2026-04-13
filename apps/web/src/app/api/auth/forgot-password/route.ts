import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@customer-pulse/db/client";

const schema = z.object({
  email: z.string().email("Invalid email").max(255),
});

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

  const emailNorm = parsed.data.email.trim().toLowerCase();
  const db = getDb();

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${emailNorm}`)
    .limit(1);

  // Always return success to prevent email enumeration
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  // Generate a secure random token
  const token = globalThis.crypto.randomUUID() + globalThis.crypto.randomUUID();
  const now = new Date();

  await db
    .update(users)
    .set({
      resetPasswordToken: token,
      resetPasswordSentAt: now,
      updatedAt: now,
    })
    .where(eq(users.id, user.id));

  // Send password reset email via worker queue if available, otherwise log for dev
  try {
    const { Queue } = await import("bullmq");
    const { getRedis } = await import("@/lib/redis");
    const { QUEUE_MAILERS } = await import("@/lib/queue-names");
    const q = new Queue(QUEUE_MAILERS, { connection: getRedis() });
    await q.add(
      "SendPasswordResetJob",
      { email: emailNorm, token },
      { removeOnComplete: 100, removeOnFail: 500 },
    );
  } catch {
    // Redis not available — log for local dev
    const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3001"}/reset-password?token=${token}`;
    console.log(`[auth] Password reset link for ${emailNorm}: ${resetUrl}`);
  }

  return NextResponse.json({ ok: true });
}
