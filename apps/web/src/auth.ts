import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { eq, and, sql } from "drizzle-orm";
import { UserRole, projectInvitations, projectUsers } from "@customer-pulse/db/client";
import { tenantInvitations, tenantMemberships, TenantMemberRole } from "@customer-pulse/db/control-plane";
import { getUserAuthDb, getDb, getControlPlaneDb, isMultiTenant } from "@/lib/db";

/**
 * Auth.js (NextAuth v5) with JWT sessions — no separate sessions table.
 * - Credentials: verifies against existing `users.encrypted_password` (bcrypt).
 * - Google: links OAuth account to an existing user by email, or creates one.
 *
 * All user-auth reads/writes go through `getUserAuthDb()` which points at the
 * control plane in multi-tenant mode and the tenant DB in single-tenant mode.
 * Invitations are tenant-scoped in MT (`tenant_invitations`) vs project-scoped in
 * ST (`project_invitations`) — the only real branch left below.
 */

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const emailNorm = String(credentials?.email ?? "")
        .trim()
        .toLowerCase();
      if (!emailNorm || !credentials?.password) {
        return null;
      }
      const bcrypt = (await import("bcryptjs")).default;
      const { db, usersTable } = getUserAuthDb();
      const rows = await db
        .select()
        .from(usersTable)
        .where(sql`lower(${usersTable.email}) = ${emailNorm}`)
        .limit(1);
      const user = rows[0];
      if (!user?.encryptedPassword) {
        return null;
      }
      const ok = await bcrypt.compare(credentials.password as string, user.encryptedPassword);
      if (!ok) {
        return null;
      }
      return {
        id: String(user.id),
        email: user.email,
        name: user.name ?? undefined,
        role: user.role,
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.unshift(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

const cookieDomain = process.env.AUTH_COOKIE_DOMAIN || undefined;

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers,
  ...(cookieDomain
    ? {
        cookies: {
          sessionToken: {
            name: "__Secure-next-auth.session-token",
            options: {
              httpOnly: true,
              sameSite: "lax" as const,
              path: "/",
              secure: true,
              domain: cookieDomain,
            },
          },
        },
      }
    : {}),
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google" || !profile?.email) {
        return true;
      }
      const email = String(profile.email);
      const { db, usersTable } = getUserAuthDb();
      const rows = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
      const picture = "picture" in profile && typeof profile.picture === "string" ? profile.picture : null;
      const now = new Date();

      if (rows[0]) {
        await db
          .update(usersTable)
          .set({
            provider: "google_oauth2",
            uid: account.providerAccountId,
            avatarUrl: picture,
            updatedAt: now,
          })
          .where(eq(usersTable.id, rows[0].id));
        return true;
      }

      const bcrypt = (await import("bcryptjs")).default;
      const randomPassword = await bcrypt.hash(globalThis.crypto.randomUUID(), 10);

      if (isMultiTenant()) {
        const cpDb = getControlPlaneDb();
        const pendingInvites = await cpDb
          .select()
          .from(tenantInvitations)
          .where(eq(tenantInvitations.email, email));
        const hasInvites = pendingInvites.length > 0;

        const { cpUsers } = await import("@customer-pulse/db/control-plane");
        const [inserted] = await cpDb
          .insert(cpUsers)
          .values({
            email,
            name: (profile.name as string) ?? email.split("@")[0]!,
            encryptedPassword: randomPassword,
            role: UserRole.admin,
            createdAt: now,
            updatedAt: now,
            provider: "google_oauth2",
            uid: account.providerAccountId,
            avatarUrl: picture,
            onboardingCompletedAt: hasInvites ? now : null,
            onboardingCurrentStep: hasInvites ? "complete" : "welcome",
          })
          .returning({ id: cpUsers.id });

        if (inserted && hasInvites) {
          for (const invite of pendingInvites) {
            const [existing] = await cpDb
              .select({ id: tenantMemberships.id })
              .from(tenantMemberships)
              .where(and(eq(tenantMemberships.tenantId, invite.tenantId), eq(tenantMemberships.userId, inserted.id)))
              .limit(1);
            if (!existing) {
              await cpDb.insert(tenantMemberships).values({
                tenantId: invite.tenantId,
                userId: inserted.id,
                role: TenantMemberRole.member,
                createdAt: now,
                updatedAt: now,
              });
            }
          }
          await cpDb.delete(tenantInvitations).where(eq(tenantInvitations.email, email));
        }
        return true;
      }

      // Single-tenant: create user + consume project invitations in the tenant DB.
      const stDb = getDb();
      const { users } = await import("@customer-pulse/db/client");
      const pendingInvites = await stDb
        .select()
        .from(projectInvitations)
        .where(eq(projectInvitations.email, email));
      const hasInvites = pendingInvites.length > 0;

      const [inserted] = await stDb
        .insert(users)
        .values({
          email,
          name: (profile.name as string) ?? email.split("@")[0]!,
          encryptedPassword: randomPassword,
          role: UserRole.admin,
          createdAt: now,
          updatedAt: now,
          provider: "google_oauth2",
          uid: account.providerAccountId,
          avatarUrl: picture,
          onboardingCompletedAt: hasInvites ? now : null,
          onboardingCurrentStep: hasInvites ? "complete" : "welcome",
        })
        .returning({ id: users.id });

      if (inserted && hasInvites) {
        for (const invite of pendingInvites) {
          const [existing] = await stDb
            .select()
            .from(projectUsers)
            .where(and(eq(projectUsers.projectId, invite.projectId), eq(projectUsers.userId, inserted.id)))
            .limit(1);
          if (!existing) {
            await stDb.insert(projectUsers).values({
              projectId: invite.projectId,
              userId: inserted.id,
              invitedById: invite.invitedById,
              isOwner: false,
              createdAt: now,
              updatedAt: now,
            });
          }
        }
        await stDb.delete(projectInvitations).where(eq(projectInvitations.email, email));
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        const { db, usersTable } = getUserAuthDb();
        const rows = await db.select().from(usersTable).where(eq(usersTable.email, String(profile.email))).limit(1);
        const row = rows[0];
        if (row) {
          token.sub = String(row.id);
          token.role = row.role;
          token.name = row.name;
        }
      } else if (user) {
        token.sub = user.id;
        token.role = user.role ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = typeof token.role === "number" ? token.role : 0;
      }
      return session;
    },
  },
});
