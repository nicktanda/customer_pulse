import { createDb, type Database } from "@customer-pulse/db/client";
import { createControlPlaneDb, type ControlPlaneDatabase } from "@customer-pulse/db/control-plane";
import { getTenantConnectionManager } from "@customer-pulse/db/tenant-connection-manager";

// Same `globalThis` pattern as `apps/web/src/lib/db.ts` — watch mode / restarts should not
// leak extra pools on each reload.
const globalForWorkerDb = globalThis as typeof globalThis & {
  __customerPulseWorkerDb?: Database;
  __customerPulseWorkerCpDb?: ControlPlaneDatabase;
};

/**
 * Single-tenant fallback: singleton backed by DATABASE_URL.
 * Used when MULTI_TENANT is not set (local dev).
 */
export function getWorkerDb(): Database {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required for the worker.");
  }
  if (!globalForWorkerDb.__customerPulseWorkerDb) {
    globalForWorkerDb.__customerPulseWorkerDb = createDb(url);
  }
  return globalForWorkerDb.__customerPulseWorkerDb;
}

/**
 * Multi-tenant: get a tenant-specific Drizzle instance via the connection manager.
 */
export function getWorkerTenantDb(slug: string, connectionString: string): Database {
  return getTenantConnectionManager().getTenantDb(slug, connectionString);
}

/**
 * Control-plane DB singleton for the worker (tenant registry, user auth).
 */
export function getWorkerControlPlaneDb(): ControlPlaneDatabase {
  const url = process.env.CONTROL_PLANE_DATABASE_URL;
  if (!url) {
    throw new Error("CONTROL_PLANE_DATABASE_URL is required when MULTI_TENANT=true.");
  }
  if (!globalForWorkerDb.__customerPulseWorkerCpDb) {
    globalForWorkerDb.__customerPulseWorkerCpDb = createControlPlaneDb(url);
  }
  return globalForWorkerDb.__customerPulseWorkerCpDb;
}

export function isMultiTenant(): boolean {
  return process.env.MULTI_TENANT === "true";
}
