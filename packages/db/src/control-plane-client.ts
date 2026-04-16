/**
 * Drizzle client for the control-plane database.
 *
 * Separate from the tenant `createDb` so the two schemas never mix.
 * Import via `@customer-pulse/db/control-plane`.
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./control-plane-schema";

export type ControlPlaneDatabase = ReturnType<typeof createControlPlaneDb>;

export function createControlPlaneDb(connectionString: string) {
  const fromEnv = Number.parseInt(process.env.CP_DATABASE_POOL_MAX ?? "", 10);
  const max = Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 5;
  const client = postgres(connectionString, { max });
  return drizzle(client, { schema });
}

export * from "./control-plane-schema";
