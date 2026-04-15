import { createDb, type Database } from "@customer-pulse/db/client";

/**
 * Reuse one Drizzle + postgres.js pool for the whole Node process.
 *
 * **Why `globalThis`:** In Next.js dev, Fast Refresh re-runs this module often. A normal
 * `let db = null` resets each time, so each reload called `createDb()` again and opened a
 * *new* pool (up to `max` connections each) without closing the old one quickly enough.
 * PostgreSQL then hits "too many clients already". Storing the client on `globalThis`
 * survives hot reloads so we keep a single pool.
 *
 * Imports `@customer-pulse/db/client` (no Lockbox) so Auth.js middleware stays lean.
 */
const globalForDb = globalThis as typeof globalThis & {
  __customerPulseDb?: Database;
};

export function getDb(): Database {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required (see repo root `.env.example`).");
  }
  if (!globalForDb.__customerPulseDb) {
    globalForDb.__customerPulseDb = createDb(process.env.DATABASE_URL);
  }
  return globalForDb.__customerPulseDb;
}
