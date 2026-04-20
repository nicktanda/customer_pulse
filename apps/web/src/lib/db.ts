import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { createDb, type Database } from "@customer-pulse/db/client";
import { users } from "@customer-pulse/db/client";
import {
  createControlPlaneDb,
  type ControlPlaneDatabase,
  cpUsers,
  tenants,
  tenantMemberships,
  TenantStatus,
} from "@customer-pulse/db/control-plane";
import { getTenantConnectionManager } from "@customer-pulse/db/tenant-connection-manager";
import { decryptTenantConnectionString } from "@customer-pulse/db/lockbox";

/**
 * Reuse one Drizzle + postgres.js pool for the whole Node process.
 *
 * **Why `globalThis`:** In Next.js dev, Fast Refresh re-runs this module often. A normal
 * `let db = null` resets each time, so each reload called `createDb()` again and opened a
 * *new* pool (up to `max` connections each) without closing the old one quickly enough.
 * PostgreSQL then hits "too many clients already". Storing the client on `globalThis`
 * survives hot reloads so we keep a single pool.
 *
 * **Multi-tenant mode** (`MULTI_TENANT=true`): the request-scoped `getRequestDb()` helper
 * resolves the tenant from the `x-tenant-slug` header set by middleware, decrypts its
 * connection string, and returns a per-tenant Drizzle instance from the shared
 * `TenantConnectionManager`.  Callsites inside `/app/*` pages, server actions, and
 * tenant-scoped API routes must use `getRequestDb()` so each request targets the right
 * tenant database.  User-auth queries (credentials login, registration, password reset)
 * must instead use `getUserAuthDb()` which returns the control-plane in MT mode.
 */
const globalForDb = globalThis as typeof globalThis & {
  __customerPulseDb?: Database;
  __customerPulseCpDb?: ControlPlaneDatabase;
};

/* ------------------------------------------------------------------ */
/*  Mode                                                               */
/* ------------------------------------------------------------------ */

export function isMultiTenant(): boolean {
  return process.env.MULTI_TENANT === "true";
}

/* ------------------------------------------------------------------ */
/*  Tenant DB (business data)                                          */
/* ------------------------------------------------------------------ */

/**
 * Low-level tenant DB accessor.
 *
 * - With `tenant`: return the per-tenant Drizzle instance from the connection manager.
 * - Without `tenant`: return the singleton `DATABASE_URL` pool (single-tenant mode,
 *   or the legacy fallback deployments still rely on).
 *
 * Most callers should prefer `getRequestDb()` so tenant resolution happens consistently.
 */
export function getDb(tenant?: { slug: string; connectionString: string }): Database {
  if (tenant) {
    return getTenantConnectionManager().getTenantDb(tenant.slug, tenant.connectionString);
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required (see repo root `.env.example`).");
  }
  if (!globalForDb.__customerPulseDb) {
    globalForDb.__customerPulseDb = createDb(process.env.DATABASE_URL);
  }
  return globalForDb.__customerPulseDb;
}

/* ------------------------------------------------------------------ */
/*  Control-plane DB (tenants, auth)                                   */
/* ------------------------------------------------------------------ */

export function getControlPlaneDb(): ControlPlaneDatabase {
  const url = process.env.CONTROL_PLANE_DATABASE_URL;
  if (!url) {
    throw new Error("CONTROL_PLANE_DATABASE_URL is required when MULTI_TENANT=true.");
  }
  if (!globalForDb.__customerPulseCpDb) {
    globalForDb.__customerPulseCpDb = createControlPlaneDb(url);
  }
  return globalForDb.__customerPulseCpDb;
}

/* ------------------------------------------------------------------ */
/*  Request-scoped helpers                                             */
/* ------------------------------------------------------------------ */

/**
 * DB + users table for user-auth queries (register, login, password reset).
 *
 * - MT: control-plane `users` (the authoritative row lives here; tenant DBs keep
 *   a lightweight mirror that never gets queried for auth).
 * - ST: tenant DB `users` (authoritative in single-tenant).
 */
export function getUserAuthDb() {
  if (isMultiTenant()) {
    return { db: getControlPlaneDb(), usersTable: cpUsers } as const;
  }
  return { db: getDb(), usersTable: users } as const;
}

export interface ResolvedTenant {
  tenantId: number;
  slug: string;
  connectionString: string;
}

/**
 * Resolves the active tenant for this request (MT only).
 *
 * Reads `x-tenant-slug` (set by middleware from the subdomain, or the `?tenant=` dev
 * shortcut), looks up the tenant row, decrypts its connection string.  Returns `null`
 * if MT is off or no slug is present on this request.
 */
export async function resolveTenantForRequest(): Promise<ResolvedTenant | null> {
  if (!isMultiTenant()) return null;
  const slug = (await headers()).get("x-tenant-slug");
  if (!slug) return null;

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
  return { tenantId: row.id, slug: row.slug, connectionString };
}

/**
 * Returns the DB to use for this request.
 *
 * - MT with tenant slug: the tenant's DB.
 * - MT without a slug: the control plane (so onboarding pages that live on the bare
 *   apex domain can still read the user row — the control plane schema shares the
 *   `users` table name with the tenant schema, but **only user/onboarding columns**
 *   overlap; tenant-data queries must not hit this path).
 * - ST: the singleton `DATABASE_URL` pool.
 *
 * Pages that need tenant data (feedback, projects, integrations, …) should call
 * `requireRequestTenantDb()` to fail loud when they accidentally run without a tenant.
 */
export async function getRequestDb(): Promise<Database> {
  if (!isMultiTenant()) return getDb();
  const tenant = await resolveTenantForRequest();
  if (tenant) {
    return getDb({ slug: tenant.slug, connectionString: tenant.connectionString });
  }
  // MT fallback — e.g. during onboarding before a tenant exists.  The control plane
  // DB is returned as a `Database` shape; callers that touch tenant-only tables must
  // use `requireRequestTenantDb()` instead so they error here rather than querying CP.
  return getControlPlaneDb() as unknown as Database;
}

/**
 * Like `getRequestDb()` but errors if the request is not scoped to a tenant.
 * Use for anything that must read/write tenant tables (feedback, projects, etc.).
 */
export async function requireRequestTenantDb(): Promise<{ db: Database; tenant: ResolvedTenant | null }> {
  if (!isMultiTenant()) {
    return { db: getDb(), tenant: null };
  }
  const tenant = await resolveTenantForRequest();
  if (!tenant) {
    throw new Error("This request is not scoped to a tenant (missing x-tenant-slug).");
  }
  return { db: getDb({ slug: tenant.slug, connectionString: tenant.connectionString }), tenant };
}

/**
 * Verify that `userId` has a membership row in the current tenant.  MT only.
 */
export async function userIsMemberOfCurrentTenant(userId: number): Promise<boolean> {
  const tenant = await resolveTenantForRequest();
  if (!tenant) return false;
  const cpDb = getControlPlaneDb();
  const [row] = await cpDb
    .select({ id: tenantMemberships.id })
    .from(tenantMemberships)
    .where(and(eq(tenantMemberships.tenantId, tenant.tenantId), eq(tenantMemberships.userId, userId)))
    .limit(1);
  return Boolean(row);
}

/**
 * List all tenants a user belongs to — used to pick a destination subdomain after login.
 */
export async function listUserTenants(userId: number): Promise<{ id: number; slug: string; name: string }[]> {
  if (!isMultiTenant()) return [];
  const cpDb = getControlPlaneDb();
  return cpDb
    .select({ id: tenants.id, slug: tenants.slug, name: tenants.name })
    .from(tenantMemberships)
    .innerJoin(tenants, eq(tenantMemberships.tenantId, tenants.id))
    .where(and(eq(tenantMemberships.userId, userId), eq(tenants.status, TenantStatus.active)));
}
