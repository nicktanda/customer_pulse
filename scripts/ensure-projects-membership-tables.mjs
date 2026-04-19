#!/usr/bin/env node
/**
 * Ensures `projects` and `project_users` exist (fixes 42P01 when the DB was never fully migrated),
 * ensures `project_id` exists on project-scoped tables (fixes missing column errors on older DBs),
 * and ensures Strategy / NL reporting tables (`teams`, `reporting_requests`, project strategy columns).
 *
 * Usage (repo root):
 *   node --env-file=.env scripts/ensure-projects-membership-tables.mjs
 *
 * Also loads apps/web/.env.local if present (same merge order as bootstrap script).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

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
  console.error("DATABASE_URL is not set. Add it to .env or apps/web/.env.local");
  process.exit(1);
}

const sqlFiles = [
  path.join(ROOT, "packages", "db", "sql", "ensure_projects_and_members.sql"),
  path.join(ROOT, "packages", "db", "sql", "ensure_project_id_columns.sql"),
  // Matches Drizzle 0001_strategy_reporting; safe if you only ran 0000_init or a legacy schema.
  path.join(ROOT, "packages", "db", "sql", "ensure_strategy_reporting.sql"),
  // project_invitations + project_settings tables.
  path.join(ROOT, "packages", "db", "sql", "ensure_new_tables.sql"),
];

const sql = postgres(DATABASE_URL, { onnotice: () => {} });

try {
  for (const sqlFile of sqlFiles) {
    const ddl = fs.readFileSync(sqlFile, "utf8");
    await sql.unsafe(ddl);
  }
  console.log(
    "OK: ran idempotent DDL (projects/membership, project_id columns, teams, reporting_requests, project_invitations, project_settings). Your DB matches the Next.js schema or was already up to date.",
  );
} finally {
  await sql.end({ timeout: 5 });
}
