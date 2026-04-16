import "server-only";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getControlPlaneDb } from "@/lib/db";
import { tenants, TenantStatus } from "@customer-pulse/db/control-plane";
import { decryptTenantConnectionString } from "@customer-pulse/db/lockbox";
import type { TenantContext } from "./tenant-context";

/**
 * Resolve the current tenant from the `x-tenant-slug` header set by middleware.
 *
 * Returns `null` when multi-tenant mode is off or no tenant slug is present.
 * Throws if the slug doesn't match an active tenant (callers should redirect to an error page).
 */
export async function resolveTenantFromRequest(): Promise<TenantContext | null> {
  if (!isMultiTenant()) return null;

  const slug = (await headers()).get("x-tenant-slug");
  if (!slug) return null;

  return resolveTenantBySlug(slug);
}

/**
 * Resolve a tenant by slug — used by middleware header path and webhook path params.
 */
export async function resolveTenantBySlug(slug: string): Promise<TenantContext | null> {
  const cpDb = getControlPlaneDb();
  const [row] = await cpDb
    .select({
      id: tenants.id,
      slug: tenants.slug,
      connectionStringCiphertext: tenants.connectionStringCiphertext,
      status: tenants.status,
    })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  if (!row || row.status !== TenantStatus.active) return null;

  const masterKey = process.env.LOCKBOX_MASTER_KEY ?? "";
  const connectionString = decryptTenantConnectionString(row.connectionStringCiphertext, masterKey);

  return {
    tenantId: row.id,
    slug: row.slug,
    connectionString,
  };
}

export function isMultiTenant(): boolean {
  return process.env.MULTI_TENANT === "true";
}
