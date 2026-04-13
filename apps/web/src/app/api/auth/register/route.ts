import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users, projectInvitations, projectUsers } from "@customer-pulse/db/client";
import { UserRole } from "@customer-pulse/db/client";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? "Validation failed";
    return NextResponse.json({ error: firstError }, { status: 422 });
  }

  const { name, email: rawEmail, password } = parsed.data;
  const emailNorm = rawEmail.trim().toLowerCase();

  const bcrypt = (await import("bcryptjs")).default;
  const hashedPassword = await bcrypt.hash(password, 10);

  const db = getDb();

  // Check for pending project invitations before creating the user
  const pendingInvites = await db
    .select()
    .from(projectInvitations)
    .where(eq(projectInvitations.email, emailNorm));

  const now = new Date();
  const hasInvites = pendingInvites.length > 0;

  let newUser: { id: number; email: string };
  try {
    const [inserted] = await db
      .insert(users)
      .values({
        email: emailNorm,
        name: name.trim(),
        encryptedPassword: hashedPassword,
        role: UserRole.admin,
        createdAt: now,
        updatedAt: now,
        onboardingCompletedAt: hasInvites ? now : null,
        onboardingCurrentStep: hasInvites ? "complete" : "welcome",
      })
      .returning({ id: users.id, email: users.email });

    if (!inserted) {
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }
    newUser = inserted;
  } catch (err: unknown) {
    // Unique constraint violation on email
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505") {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    throw err;
  }

  // Convert pending invitations to project_users records
  if (hasInvites) {
    for (const invite of pendingInvites) {
      const [existing] = await db
        .select()
        .from(projectUsers)
        .where(and(eq(projectUsers.projectId, invite.projectId), eq(projectUsers.userId, newUser.id)))
        .limit(1);
      if (!existing) {
        await db.insert(projectUsers).values({
          projectId: invite.projectId,
          userId: newUser.id,
          invitedById: invite.invitedById,
          isOwner: false,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    // Clean up consumed invitations
    await db.delete(projectInvitations).where(eq(projectInvitations.email, emailNorm));
  }

  return NextResponse.json({ ok: true, userId: newUser.id }, { status: 201 });
}
