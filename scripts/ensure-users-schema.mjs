#!/usr/bin/env node
/**
 * Adds columns that Drizzle expects on `users` but older databases may still lack.
 * Fixes: PostgresError: column "provider" does not exist (Auth.js selects full row).
 *
 * Run from repo root: yarn db:ensure-users-schema
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { USERS_TABLE_DDL } from "./users-schema-ddl.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

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

loadEnvFile(path.join(ROOT, ".env"));
loadEnvFile(path.join(ROOT, "apps", "web", ".env"));
loadEnvFile(path.join(ROOT, "apps", "web", ".env.local"), { overrideExisting: true });

const DATABASE_URL = process.env.DATABASE_URL?.trim();
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set (.env or apps/web/.env.local).");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { onnotice: () => {} });
try {
  for (const ddl of USERS_TABLE_DDL) {
    await sql.unsafe(ddl);
  }
  console.log("OK: users table has OAuth + onboarding columns (or they were already present).");
} finally {
  await sql.end({ timeout: 5 });
}
