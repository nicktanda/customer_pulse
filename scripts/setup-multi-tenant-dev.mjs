#!/usr/bin/env node
/**
 * Bootstrap a local multi-tenant development environment.
 *
 * Usage:
 *   node --env-file=.env scripts/setup-multi-tenant-dev.mjs
 *
 * What it does:
 *   1. Creates the `customer_pulse_control_plane` database (if it doesn't exist)
 *   2. Pushes the control plane schema via drizzle-kit
 *   3. Creates a default tenant pointing at the existing `customer_pulse_development` DB
 *   4. Creates a tenant membership for the first user (if one exists)
 *
 * Prerequisites:
 *   - PostgreSQL running locally
 *   - LOCKBOX_MASTER_KEY set in .env
 *   - DATABASE_URL set (for the default tenant DB)
 */
import postgres from "postgres";
import { execSync } from "child_process";
import crypto from "crypto";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://localhost:5432/customer_pulse_development";
const CP_DATABASE = "customer_pulse_control_plane";

// Parse the base connection (without a specific database) from DATABASE_URL
const dbUrl = new URL(DATABASE_URL);
const baseUrl = `${dbUrl.protocol}//${dbUrl.username}${dbUrl.password ? ":" + dbUrl.password : ""}@${dbUrl.host}/postgres`;
const cpUrl = `${dbUrl.protocol}//${dbUrl.username}${dbUrl.password ? ":" + dbUrl.password : ""}@${dbUrl.host}/${CP_DATABASE}`;

async function main() {
  const masterKey = process.env.LOCKBOX_MASTER_KEY;
  if (!masterKey) {
    console.error("LOCKBOX_MASTER_KEY is required in .env");
    process.exit(1);
  }

  // 1. Create control plane database if needed
  console.log(`Creating database ${CP_DATABASE} (if not exists)...`);
  const adminSql = postgres(baseUrl, { max: 1 });
  try {
    const existing = await adminSql`SELECT 1 FROM pg_database WHERE datname = ${CP_DATABASE}`;
    if (existing.length === 0) {
      await adminSql.unsafe(`CREATE DATABASE "${CP_DATABASE}"`);
      console.log(`  Created ${CP_DATABASE}`);
    } else {
      console.log(`  ${CP_DATABASE} already exists`);
    }
  } finally {
    await adminSql.end({ timeout: 5 });
  }

  // 2. Push control plane schema
  console.log("Pushing control plane schema...");
  execSync("npx drizzle-kit push --config=packages/db/drizzle-control-plane.config.ts", {
    env: { ...process.env, CONTROL_PLANE_DATABASE_URL: cpUrl },
    stdio: "inherit",
    cwd: process.cwd(),
  });

  // 3. Create default tenant
  console.log("Creating default tenant...");
  const cpSql = postgres(cpUrl, { max: 1 });
  try {
    // Check if tenant already exists
    const existingTenant = await cpSql`SELECT id FROM tenants WHERE slug = 'dev'`;
    if (existingTenant.length > 0) {
      console.log("  Default 'dev' tenant already exists");
    } else {
      // Encrypt the DATABASE_URL for storage
      const { hkdfSync, createCipheriv, randomBytes } = crypto;
      const ikm = Buffer.from(masterKey, "hex");
      const salt = Buffer.from("tenants", "utf8");
      const separator = Buffer.alloc(32, 0xb4);
      const info = Buffer.concat([separator, Buffer.from("connection_string", "utf8")]);
      const key = Buffer.from(hkdfSync("sha384", ikm, salt, info, 32));
      const nonce = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, nonce);
      const enc = Buffer.concat([cipher.update(DATABASE_URL, "utf8"), cipher.final()]);
      const tag = cipher.getAuthTag();
      const ciphertext = Buffer.concat([nonce, enc, tag]).toString("base64");

      const now = new Date();
      await cpSql`
        INSERT INTO tenants (name, slug, database_name, connection_string_ciphertext, status, plan, created_at, updated_at)
        VALUES ('Development', 'dev', 'customer_pulse_development', ${ciphertext}, 1, 'free', ${now}, ${now})
      `;
      console.log("  Created 'dev' tenant pointing at customer_pulse_development");
    }

    // 4. Link first user to tenant
    const [firstUser] = await cpSql`SELECT id FROM users ORDER BY id LIMIT 1`;
    if (firstUser) {
      const [tenant] = await cpSql`SELECT id FROM tenants WHERE slug = 'dev'`;
      if (tenant) {
        const existingMembership = await cpSql`
          SELECT id FROM tenant_memberships WHERE tenant_id = ${tenant.id} AND user_id = ${firstUser.id}
        `;
        if (existingMembership.length === 0) {
          const now = new Date();
          await cpSql`
            INSERT INTO tenant_memberships (tenant_id, user_id, role, created_at, updated_at)
            VALUES (${tenant.id}, ${firstUser.id}, 2, ${now}, ${now})
          `;
          console.log(`  Linked user ${firstUser.id} to 'dev' tenant as owner`);
        } else {
          console.log(`  User ${firstUser.id} already linked to 'dev' tenant`);
        }
      }
    } else {
      console.log("  No users found — run bootstrap:dev-users first, then re-run this script");
    }
  } finally {
    await cpSql.end({ timeout: 5 });
  }

  console.log("\nDone! Add these to your .env to enable multi-tenant mode:");
  console.log(`  MULTI_TENANT=true`);
  console.log(`  CONTROL_PLANE_DATABASE_URL=${cpUrl}`);
  console.log(`  APP_BASE_DOMAIN=localhost:3001`);
  console.log("\nAccess via: http://localhost:3001/app?tenant=dev");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
