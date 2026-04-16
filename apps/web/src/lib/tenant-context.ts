import "server-only";

/**
 * Tenant context resolved from the subdomain.
 *
 * Populated by `resolveTenantFromRequest()` in server components / route
 * handlers after middleware sets the `x-tenant-slug` header.
 */
export interface TenantContext {
  tenantId: number;
  slug: string;
  connectionString: string;
}
