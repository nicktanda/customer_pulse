#!/usr/bin/env node
/**
 * Creates dev login users in PostgreSQL (stable demo emails/passwords for local work).
 *
 * Usage (from repo root):
 *   node scripts/bootstrap-dev-user.mjs
 *
 * Loads `.env`, `apps/web/.env`, then `apps/web/.env.local` (local overrides root — same idea as Next.js).
 *
 * Defaults:
 *   admin@example.com / password123  (role: admin)
 *   viewer@example.com / password123 (role: viewer)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { USERS_TABLE_DDL } from "./users-schema-ddl.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

/**
 * Minimal .env parser: KEY=value, optional quotes, ignores comments and blank lines.
 * - By default: only sets keys that are missing/empty (safe for CI / inherited env).
 * - overrideExisting: always apply values from this file (used so web app env wins).
 */
function loadEnvFile(filePath, { overrideExisting = false } = {}) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (overrideExisting) {
      process.env[key] = value;
    } else if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

// Match how you run the Next app: `yarn workspace web dev` loads apps/web/.env then
// apps/web/.env.local (local overrides). Root .env is often used for scripts only.
// If DATABASE_URL differed between root .env and apps/web/.env.local, bootstrap wrote
// users to one DB while login read another → "Invalid email or password" forever.
loadEnvFile(path.join(ROOT, ".env"));
loadEnvFile(path.join(ROOT, "apps", "web", ".env"));
loadEnvFile(path.join(ROOT, "apps", "web", ".env.local"), { overrideExisting: true });

const DATABASE_URL = process.env.DATABASE_URL?.trim();
if (!DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Add it to `.env` or `apps/web/.env.local`, for example:\n" +
      "  DATABASE_URL=postgres://localhost:5432/customer_pulse_development",
  );
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  // Quiet "already exists" notices from IF NOT EXISTS DDL on every bootstrap run.
  onnotice: () => {},
});

// Drizzle selects every `users` column on login; legacy DBs may omit OAuth fields.
for (const ddl of USERS_TABLE_DDL) {
  await sql.unsafe(ddl);
}

const adminEmail = process.env.DEV_ADMIN_EMAIL ?? "admin@example.com";
const adminPassword = process.env.DEV_ADMIN_PASSWORD ?? "password123";
const viewerEmail = process.env.DEV_VIEWER_EMAIL ?? "viewer@example.com";
const viewerPassword = process.env.DEV_VIEWER_PASSWORD ?? "password123";

/** DB enum `users.role`: 0 = viewer, 1 = admin (see packages/db + PARITY_MATRIX). */
async function upsertUser(email, password, name, role) {
  const emailNorm = email.trim().toLowerCase();
  const hash = await bcrypt.hash(password, 10);
  const now = new Date();
  await sql`
    INSERT INTO users (email, encrypted_password, name, role, created_at, updated_at, onboarding_completed_at)
    VALUES (${emailNorm}, ${hash}, ${name}, ${role}, ${now}, ${now}, ${now})
    ON CONFLICT (email) DO UPDATE SET
      encrypted_password = EXCLUDED.encrypted_password,
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      updated_at = EXCLUDED.updated_at,
      onboarding_completed_at = COALESCE(users.onboarding_completed_at, EXCLUDED.onboarding_completed_at)
  `;
  console.log(`OK: ${emailNorm} (role=${role === 1 ? "admin" : "viewer"})`);
}

try {
  await upsertUser(adminEmail, adminPassword, "Admin User", 1);
  await upsertUser(viewerEmail, viewerPassword, "Viewer User", 0);
  console.log("\nSign in at http://localhost:3001/login with either account above.");
} finally {
  await sql.end({ timeout: 5 });
}
