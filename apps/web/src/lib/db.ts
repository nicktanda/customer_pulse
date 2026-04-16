import { createDb, type Database } from "@customer-pulse/db/client";
import { createControlPlaneDb, type ControlPlaneDatabase } from "@customer-pulse/db/control-plane";
import { getTenantConnectionManager } from "@customer-pulse/db/tenant-connection-manager";

/**
 * Reuse one Drizzle + postgres.js pool for the whole Node process.
 *
 * **Why `globalThis`:** In Next.js dev, Fast Refresh re-runs this module often. A normal
 * `let db = null` resets each time, so each reload called `createDb()` again and opened a
 * *new* pool (up to `max` connections each) without closing the old one quickly enough.
 * PostgreSQL then hits "too many clients already". Storing the client on `globalThis`
 * survives hot reloads so we keep a single pool.
 *
 * **Multi-tenant mode** (`MULTI_TENANT=true`): callers pass a tenant context to get a
 * per-tenant Drizzle instance backed by the TenantConnectionManager.  When the env var is
 * not set, everything works exactly as before — single DATABASE_URL singleton.
 */
const globalForDb = globalThis as typeof globalThis & {
  __customerPulseDb?: Database;
  __customerPulseCpDb?: ControlPlaneDatabase;
};

/* ------------------------------------------------------------------ */
/*  Tenant DB (business data)                                          */
/* ------------------------------------------------------------------ */

/**
 * Returns a Drizzle instance for the current tenant.
 *
 * - **Single-tenant mode** (default): singleton backed by `DATABASE_URL`.
 * - **Multi-tenant mode**: provide `tenant` to get a tenant-specific pool.
 *
 * The signature stays compatible: existing callsites pass no args and work in
 * single-tenant mode.  In multi-tenant mode the app layout / route handler
 * resolves the tenant and threads it through.
 */
export function getDb(tenant?: { slug: string; connectionString: string }): Database {
  if (tenant) {
    return getTenantConnectionManager().getTenantDb(tenant.slug, tenant.connectionString);
  }

  // Single-tenant fallback (local dev / MULTI_TENANT not set)
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
