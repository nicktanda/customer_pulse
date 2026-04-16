/**
 * Run Drizzle migrations against all active tenant databases.
 *
 * Usage:
 *   node --env-file=.env --loader ts-node/esm scripts/migrate-all-tenants.ts
 *
 * Or via package script:
 *   yarn db:migrate:tenants
 *
 * Reads all active tenants from the control plane, decrypts each connection
 * string, and applies migrations with a concurrency limit.
 */
import { eq } from "drizzle-orm";
import { createControlPlaneDb } from "../packages/db/src/control-plane-client.js";
import { tenants, TenantStatus } from "../packages/db/src/control-plane-schema.js";
import { decryptTenantConnectionString } from "../packages/db/src/lockbox.js";
import { execSync } from "child_process";

const CONCURRENCY = 5;

async function main() {
  const cpUrl = process.env.CONTROL_PLANE_DATABASE_URL;
  if (!cpUrl) {
    console.error("CONTROL_PLANE_DATABASE_URL is required");
    process.exit(1);
  }
  const masterKey = process.env.LOCKBOX_MASTER_KEY ?? "";
  if (!masterKey) {
    console.error("LOCKBOX_MASTER_KEY is required to decrypt tenant connection strings");
    process.exit(1);
  }

  const cpDb = createControlPlaneDb(cpUrl);
  const activeTenants = await cpDb
    .select({
      id: tenants.id,
      slug: tenants.slug,
      connectionStringCiphertext: tenants.connectionStringCiphertext,
    })
    .from(tenants)
    .where(eq(tenants.status, TenantStatus.active));

  console.log(`Found ${activeTenants.length} active tenant(s) to migrate.`);

  // Process in batches of CONCURRENCY
  const results: { slug: string; ok: boolean; error?: string }[] = [];

  for (let i = 0; i < activeTenants.length; i += CONCURRENCY) {
    const batch = activeTenants.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(async (tenant) => {
        const connectionString = decryptTenantConnectionString(tenant.connectionStringCiphertext, masterKey);
        try {
          // Run drizzle-kit push against the tenant DB
          execSync(
            `npx drizzle-kit push --config=packages/db/drizzle.config.ts`,
            {
              env: { ...process.env, DATABASE_URL: connectionString },
              stdio: "pipe",
              cwd: process.cwd(),
            },
          );
          console.log(`  [ok] ${tenant.slug}`);
          return { slug: tenant.slug, ok: true };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`  [FAIL] ${tenant.slug}: ${msg}`);
          return { slug: tenant.slug, ok: false, error: msg };
        }
      }),
    );

    for (const r of batchResults) {
      if (r.status === "fulfilled") {
        results.push(r.value);
      } else {
        results.push({ slug: "unknown", ok: false, error: String(r.reason) });
      }
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nMigration complete: ${succeeded} succeeded, ${failed} failed out of ${activeTenants.length} tenant(s).`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
