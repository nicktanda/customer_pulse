import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { eq, and, sql } from "drizzle-orm";
import { users, projectInvitations, projectUsers, UserRole } from "@customer-pulse/db/client";
import { cpUsers, tenantMemberships, tenantInvitations } from "@customer-pulse/db/control-plane";
import { getDb, getControlPlaneDb } from "@/lib/db";

/**
 * Auth.js (NextAuth v5) with JWT sessions — no separate sessions table.
 * - Credentials: verifies against existing `users.encrypted_password` (bcrypt).
 * - Google: links OAuth account to an existing user by email, or creates one.
 *
 * In multi-tenant mode, auth reads/writes the **control-plane** DB.
 * In single-tenant mode, it uses the app DB as before.
 */
function isMultiTenant() {
  return process.env.MULTI_TENANT === "true";
}

/** Return the Drizzle table + db to use for user auth queries. */
function authDb() {
  if (isMultiTenant()) {
    return { db: getControlPlaneDb(), usersTable: cpUsers } as const;
  }
  return { db: getDb(), usersTable: users } as const;
}

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      // Normalize email (trim + lowercase) so sign-in matches how we store/compare addresses.
      const emailNorm = String(credentials?.email ?? "")
        .trim()
        .toLowerCase();
      if (!emailNorm || !credentials?.password) {
        return null;
      }
      const bcrypt = (await import("bcryptjs")).default;
      const { db, usersTable } = authDb();
      // Case-insensitive match so legacy rows (mixed-case email) still sign in.
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

/** Cookie domain for cross-subdomain sessions (e.g. `.kairos.ai`). */
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
      const { db, usersTable } = authDb();
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
      } else {
        const bcrypt = (await import("bcryptjs")).default;
        const randomPassword = await bcrypt.hash(globalThis.crypto.randomUUID(), 10);

        if (isMultiTenant()) {
          // Multi-tenant: create user in control plane, check for tenant invitations
          const cpDb = getControlPlaneDb();
          const pendingInvites = await cpDb
            .select()
            .from(tenantInvitations)
            .where(eq(tenantInvitations.email, email));
          const hasInvites = pendingInvites.length > 0;

          await cpDb.insert(cpUsers).values({
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
          });

          if (hasInvites) {
            const [newUser] = await cpDb.select().from(cpUsers).where(eq(cpUsers.email, email)).limit(1);
            if (newUser) {
              for (const invite of pendingInvites) {
                const [existing] = await cpDb
                  .select()
                  .from(tenantMemberships)
                  .where(and(eq(tenantMemberships.tenantId, invite.tenantId), eq(tenantMemberships.userId, newUser.id)))
                  .limit(1);
                if (!existing) {
                  await cpDb.insert(tenantMemberships).values({
                    tenantId: invite.tenantId,
                    userId: newUser.id,
                    role: 0,
                    createdAt: now,
                    updatedAt: now,
                  });
                }
              }
              await cpDb.delete(tenantInvitations).where(eq(tenantInvitations.email, email));
            }
          }
        } else {
          // Single-tenant: original flow
          const db = getDb();
          const pendingInvites = await db
            .select()
            .from(projectInvitations)
            .where(eq(projectInvitations.email, email));
          const hasInvites = pendingInvites.length > 0;

          await db.insert(users).values({
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
          });

          if (hasInvites) {
            const [newUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
            if (newUser) {
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
              await db.delete(projectInvitations).where(eq(projectInvitations.email, email));
            }
          }
        }
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        const { db, usersTable } = authDb();
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
