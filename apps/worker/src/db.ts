import { createDb, type Database } from "@customer-pulse/db/client";

// Same `globalThis` pattern as `apps/web/src/lib/db.ts` — watch mode / restarts should not
// leak extra pools on each reload.
const globalForWorkerDb = globalThis as typeof globalThis & {
  __customerPulseWorkerDb?: Database;
};

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
