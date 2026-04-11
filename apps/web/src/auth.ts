import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { eq, sql } from "drizzle-orm";
import { users } from "@customer-pulse/db/client";
import { getDb } from "@/lib/db";

/**
 * Auth.js (NextAuth v5) with JWT sessions — no separate sessions table.
 * - Credentials: verifies against existing `users.encrypted_password` (bcrypt).
 * - Google: links OAuth account to an existing user by email, or creates one.
 */
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
      const db = getDb();
      // Case-insensitive match so legacy rows (mixed-case email) still sign in.
      const rows = await db
        .select()
        .from(users)
        .where(sql`lower(${users.email}) = ${emailNorm}`)
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

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers,
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google" || !profile?.email) {
        return true;
      }
      const email = String(profile.email);
      const db = getDb();
      const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
      const picture = "picture" in profile && typeof profile.picture === "string" ? profile.picture : null;
      const now = new Date();
      if (rows[0]) {
        await db
          .update(users)
          .set({
            provider: "google_oauth2",
            uid: account.providerAccountId,
            avatarUrl: picture,
            updatedAt: now,
          })
          .where(eq(users.id, rows[0].id));
      } else {
        const bcrypt = (await import("bcryptjs")).default;
        const randomPassword = await bcrypt.hash(globalThis.crypto.randomUUID(), 10);
        await db.insert(users).values({
          email,
          name: (profile.name as string) ?? email.split("@")[0]!,
          encryptedPassword: randomPassword,
          role: 0,
          createdAt: now,
          updatedAt: now,
          provider: "google_oauth2",
          uid: account.providerAccountId,
          avatarUrl: picture,
        });
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        const db = getDb();
        const rows = await db.select().from(users).where(eq(users.email, String(profile.email))).limit(1);
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
