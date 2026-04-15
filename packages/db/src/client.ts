/**
 * DB entry without Lockbox — safe to import from Auth.js / Edge-adjacent bundles.
 * Use the package root `@customer-pulse/db` when you need `decryptCredentialsColumn`.
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export type Database = ReturnType<typeof createDb>;

/**
 * Creates a Drizzle instance backed by postgres.js.
 * Pool size: override with `DATABASE_POOL_MAX`; otherwise 10 in production, 5 in dev
 * (Next dev + worker + hot reload adds up quickly against Postgres `max_connections`).
 */
export function createDb(connectionString: string) {
  const fromEnv = Number.parseInt(process.env.DATABASE_POOL_MAX ?? "", 10);
  const max = Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : process.env.NODE_ENV === "production" ? 10 : 5;
  const client = postgres(connectionString, { max });
  return drizzle(client, { schema });
}

export * from "./schema";
export * from "./enums";
