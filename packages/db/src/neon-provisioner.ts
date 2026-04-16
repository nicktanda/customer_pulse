/**
 * Neon database provisioning for new tenants.
 *
 * Creates a new database within the shared Neon project using SQL
 * (`CREATE DATABASE`).  All tenant databases live on the same Neon
 * project/branch, keeping costs low and management simple.
 *
 * Requires NEON_API_KEY + NEON_PROJECT_ID env vars for connection string
 * retrieval, or a NEON_BASE_CONNECTION_URL template.
 */
import postgres from "postgres";

export interface ProvisionResult {
  databaseName: string;
  connectionString: string;
}

/**
 * Provision a new tenant database on the shared Neon project.
 *
 * @param slug - Tenant slug (used to generate the database name: `tenant_<slug>`)
 * @param adminConnectionString - Connection string with CREATE DATABASE privileges
 *                                 (typically the control plane connection or Neon project owner)
 */
export async function provisionTenantDatabase(
  slug: string,
  adminConnectionString: string,
): Promise<ProvisionResult> {
  const databaseName = `tenant_${slug.replace(/[^a-z0-9_]/g, "_")}`;

  // Use a one-shot connection (not pooled) for DDL
  const adminSql = postgres(adminConnectionString, { max: 1 });
  try {
    // CREATE DATABASE cannot run inside a transaction; postgres.js runs
    // queries outside transactions by default (no explicit BEGIN).
    await adminSql.unsafe(`CREATE DATABASE "${databaseName}"`);
  } finally {
    await adminSql.end({ timeout: 5 });
  }

  // Build the tenant connection string by replacing the database name in the admin URL
  const url = new URL(adminConnectionString);
  url.pathname = `/${databaseName}`;
  const connectionString = url.toString();

  return { databaseName, connectionString };
}

/**
 * Drop a tenant database (use with extreme care — irreversible).
 */
export async function dropTenantDatabase(
  databaseName: string,
  adminConnectionString: string,
): Promise<void> {
  const adminSql = postgres(adminConnectionString, { max: 1 });
  try {
    await adminSql.unsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
  } finally {
    await adminSql.end({ timeout: 5 });
  }
}
