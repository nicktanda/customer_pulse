import "server-only";

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
}): Promise<{ tenantId: number; slug: string }> {
  const cpDb = getControlPlaneDb();
  const masterKey = process.env.LOCKBOX_MASTER_KEY ?? "";
  const adminUrl = process.env.CONTROL_PLANE_DATABASE_URL ?? "";

  // 1. Create the Neon database
  const { databaseName, connectionString } = await provisionTenantDatabase(opts.slug, adminUrl);

  // 2. Run tenant schema migrations against the new database.
  //    For now we use Drizzle push via a temporary connection.
  //    In production, use the migration tooling (scripts/migrate-all-tenants.ts).
  const tenantSql = createDb(connectionString);
  // The schema is applied by drizzle-kit push; this connection verifies
  // connectivity and will be used by the migration script.
  // TODO: programmatic drizzle-kit push or apply SQL migration files here
  void tenantSql; // placeholder — migration applied separately

  // 3. Insert tenant record in control plane
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

  // 4. Create owner membership
  await cpDb.insert(tenantMemberships).values({
    tenantId: tenant.id,
    userId: opts.ownerUserId,
    role: TenantMemberRole.owner,
    createdAt: now,
    updatedAt: now,
  });

  // 5. Mirror user record into the tenant database
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
    await tenantDb.insert(users).values({
      id: owner.id,
      email: owner.email,
      name: owner.name,
      role: owner.role,
      provider: owner.provider,
      uid: owner.uid,
      avatarUrl: owner.avatarUrl,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing();
  }

  return { tenantId: tenant.id, slug: opts.slug };
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
