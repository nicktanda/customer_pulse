import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getUserAuthDb, isMultiTenant, getControlPlaneDb } from "@/lib/db";
import { users as tenantUsers, projectInvitations, projectUsers, UserRole } from "@customer-pulse/db/client";
import { tenantInvitations, tenantMemberships, TenantMemberRole } from "@customer-pulse/db/control-plane";

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
  const now = new Date();

  if (isMultiTenant()) {
    const cpDb = getControlPlaneDb();

    // Pending tenant invitations let the user skip onboarding and land straight in an
    // existing tenant after sign-in.
    const pendingInvites = await cpDb
      .select()
      .from(tenantInvitations)
      .where(eq(tenantInvitations.email, emailNorm));
    const hasInvites = pendingInvites.length > 0;

    const { cpUsers } = await import("@customer-pulse/db/control-plane");

    let newUserId: number;
    try {
      const [inserted] = await cpDb
        .insert(cpUsers)
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
        .returning({ id: cpUsers.id });
      if (!inserted) {
        return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
      }
      newUserId = inserted.id;
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505") {
        return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
      }
      throw err;
    }

    if (hasInvites) {
      for (const invite of pendingInvites) {
        const [existing] = await cpDb
          .select({ id: tenantMemberships.id })
          .from(tenantMemberships)
          .where(and(eq(tenantMemberships.tenantId, invite.tenantId), eq(tenantMemberships.userId, newUserId)))
          .limit(1);
        if (!existing) {
          await cpDb.insert(tenantMemberships).values({
            tenantId: invite.tenantId,
            userId: newUserId,
            role: TenantMemberRole.member,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
      await cpDb.delete(tenantInvitations).where(eq(tenantInvitations.email, emailNorm));
    }

    return NextResponse.json({ ok: true, userId: newUserId }, { status: 201 });
  }

  // --- Single-tenant path: mirrors the original flow, which stores everything in the
  // tenant DB (there is no control plane to split into).
  const { db } = getUserAuthDb();

  const pendingInvites = await db
    .select()
    .from(projectInvitations)
    .where(eq(projectInvitations.email, emailNorm));
  const hasInvites = pendingInvites.length > 0;

  let newUser: { id: number; email: string };
  try {
    const [inserted] = await db
      .insert(tenantUsers)
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
      .returning({ id: tenantUsers.id, email: tenantUsers.email });

    if (!inserted) {
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }
    newUser = inserted;
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505") {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    throw err;
  }

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
    await db.delete(projectInvitations).where(eq(projectInvitations.email, emailNorm));
  }

  return NextResponse.json({ ok: true, userId: newUser.id }, { status: 201 });
}
