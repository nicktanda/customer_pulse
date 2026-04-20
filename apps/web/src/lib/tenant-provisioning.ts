import "server-only";

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { eq } from "drizzle-orm";
import { getControlPlaneDb } from "@/lib/db";
import { tenants, tenantMemberships, cpUsers, TenantStatus, TenantMemberRole } from "@customer-pulse/db/control-plane";
import { users } from "@customer-pulse/db/client";
import { encryptTenantConnectionString } from "@customer-pulse/db/lockbox";
import { provisionTenantDatabase } from "@customer-pulse/db/neon-provisioner";
import { createDb } from "@customer-pulse/db/client";

/**
 * Provision a new tenant: create a Neon database, run the tenant schema,
 * register in the control plane, and mirror the owner's user record.
 */
export async function provisionTenant(opts: {
  name: string;
  slug: string;
  ownerUserId: number;
}): Promise<{ tenantId: number; slug: string; connectionString: string }> {
  const cpDb = getControlPlaneDb();
  const masterKey = process.env.LOCKBOX_MASTER_KEY ?? "";
  if (!masterKey) {
    throw new Error("LOCKBOX_MASTER_KEY is required to provision a tenant.");
  }
  const adminUrl = process.env.CONTROL_PLANE_DATABASE_URL ?? "";
  if (!adminUrl) {
    throw new Error("CONTROL_PLANE_DATABASE_URL is required to provision a tenant.");
  }

  // 1. Create the Neon database.
  const { databaseName, connectionString } = await provisionTenantDatabase(opts.slug, adminUrl);

  // 2. Apply the tenant schema to the fresh database.
  applyTenantSchema(connectionString);

  // 3. Register the tenant in the control plane.
  const ciphertext = encryptTenantConnectionString(connectionString, masterKey);
  const now = new Date();

  const [tenant] = await cpDb
    .insert(tenants)
    .values({
      name: opts.name,
      slug: opts.slug,
      databaseName,
      connectionStringCiphertext: ciphertext,
      status: TenantStatus.active,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: tenants.id });

  if (!tenant) throw new Error("Failed to create tenant record");

  // 4. Create owner membership.
  await cpDb.insert(tenantMemberships).values({
    tenantId: tenant.id,
    userId: opts.ownerUserId,
    role: TenantMemberRole.owner,
    createdAt: now,
    updatedAt: now,
  });

  // 5. Mirror the user row into the new tenant DB so joins inside the tenant still work.
  const [owner] = await cpDb
    .select({
      id: cpUsers.id,
      email: cpUsers.email,
      name: cpUsers.name,
      role: cpUsers.role,
      provider: cpUsers.provider,
      uid: cpUsers.uid,
      avatarUrl: cpUsers.avatarUrl,
    })
    .from(cpUsers)
    .where(eq(cpUsers.id, opts.ownerUserId))
    .limit(1);

  if (owner) {
    const tenantDb = createDb(connectionString);
    await tenantDb
      .insert(users)
      .values({
        id: owner.id,
        email: owner.email,
        name: owner.name,
        role: owner.role,
        provider: owner.provider,
        uid: owner.uid,
        avatarUrl: owner.avatarUrl,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
  }

  return { tenantId: tenant.id, slug: opts.slug, connectionString };
}

/**
 * Runs `drizzle-kit push` against a freshly-provisioned tenant database to create the
 * tenant schema (tables, indexes, enums).  Blocking / synchronous — keeps provisioning
 * simple; expect 5–10s for a cold Neon compute.
 *
 * Matches `scripts/migrate-all-tenants.ts` so re-running migrations later stays idempotent.
 */
function applyTenantSchema(connectionString: string): void {
  // The repo root holds `packages/db/drizzle.config.ts`.  Next.js runs from `apps/web`, so
  // resolve the repo root by walking up from `process.cwd()` until we find the workspace.
  const repoRoot = findRepoRoot(process.cwd());
  execSync(`npx drizzle-kit push --config=packages/db/drizzle.config.ts --force`, {
    env: {
      ...process.env,
      DATABASE_URL: connectionString,
    },
    cwd: repoRoot,
    stdio: "pipe",
  });
}

function findRepoRoot(start: string): string {
  // Walks up directory tree until it finds a directory containing `packages/db/drizzle.config.ts`.
  // Falls back to `start` if nothing is found (push will error and surface the problem).
  let dir = start;
  for (let i = 0; i < 6; i++) {
    const cfg = path.join(dir, "packages", "db", "drizzle.config.ts");
    if (fs.existsSync(cfg)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

/** Generate a URL-safe slug from an organization name. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}
