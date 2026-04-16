/**
 * Control-plane schema for multi-tenant routing.
 *
 * Lives in a dedicated database (CONTROL_PLANE_DATABASE_URL) separate from
 * per-tenant databases.  Stores tenant metadata, user auth, and membership.
 */
import {
  pgTable,
  bigserial,
  bigint,
  text,
  integer,
  boolean,
  timestamp,
  varchar,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ------------------------------------------------------------------ */
/*  Enums (integer, same pattern as enums.ts)                          */
/* ------------------------------------------------------------------ */

export const TenantStatus = {
  provisioning: 0,
  active: 1,
  suspended: 2,
  deleted: 3,
} as const;

export const TenantMemberRole = {
  member: 0,
  admin: 1,
  owner: 2,
} as const;

/* ------------------------------------------------------------------ */
/*  Tables                                                             */
/* ------------------------------------------------------------------ */

export const tenants = pgTable(
  "tenants",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    databaseName: varchar("database_name", { length: 255 }).notNull(),
    /** Neon connection string, encrypted with Lockbox (table=tenants, attribute=connection_string). */
    connectionStringCiphertext: text("connection_string_ciphertext").notNull(),
    status: integer("status").notNull().default(TenantStatus.provisioning),
    plan: varchar("plan", { length: 50 }).notNull().default("free"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("index_tenants_on_slug").on(t.slug),
    uniqueIndex("index_tenants_on_database_name").on(t.databaseName),
  ],
);

/**
 * Authoritative user table for authentication.
 *
 * Tenant databases keep a lightweight mirror (no password / reset fields) so
 * existing Drizzle joins still work; auth always queries this table.
 */
export const cpUsers = pgTable(
  "users",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    email: varchar("email", { length: 255 }).notNull().default(""),
    encryptedPassword: varchar("encrypted_password", { length: 255 }).notNull().default(""),
    resetPasswordToken: varchar("reset_password_token", { length: 255 }),
    resetPasswordSentAt: timestamp("reset_password_sent_at", { withTimezone: true }),
    rememberCreatedAt: timestamp("remember_created_at", { withTimezone: true }),
    name: varchar("name", { length: 255 }),
    role: integer("role").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    onboardingCurrentStep: varchar("onboarding_current_step", { length: 255 }).default("welcome"),
    provider: varchar("provider", { length: 255 }),
    uid: varchar("uid", { length: 255 }),
    avatarUrl: varchar("avatar_url", { length: 255 }),
  },
  (t) => [
    uniqueIndex("index_cp_users_on_email").on(t.email),
    uniqueIndex("index_cp_users_on_provider_and_uid").on(t.provider, t.uid),
    uniqueIndex("index_cp_users_on_reset_password_token").on(t.resetPasswordToken),
  ],
);

export const tenantMemberships = pgTable(
  "tenant_memberships",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    tenantId: bigint("tenant_id", { mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    role: integer("role").notNull().default(TenantMemberRole.member),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("index_tenant_memberships_on_tenant_id_and_user_id").on(t.tenantId, t.userId),
    index("index_tenant_memberships_on_tenant_id").on(t.tenantId),
    index("index_tenant_memberships_on_user_id").on(t.userId),
  ],
);

export const tenantInvitations = pgTable(
  "tenant_invitations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    tenantId: bigint("tenant_id", { mode: "number" }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    invitedById: bigint("invited_by_id", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("index_tenant_invitations_on_tenant_id_and_email").on(t.tenantId, t.email),
    index("index_tenant_invitations_on_email").on(t.email),
  ],
);

/* ------------------------------------------------------------------ */
/*  Relations                                                          */
/* ------------------------------------------------------------------ */

export const tenantsRelations = relations(tenants, ({ many }) => ({
  memberships: many(tenantMemberships),
  invitations: many(tenantInvitations),
}));

export const cpUsersRelations = relations(cpUsers, ({ many }) => ({
  memberships: many(tenantMemberships),
}));

export const tenantMembershipsRelations = relations(tenantMemberships, ({ one }) => ({
  tenant: one(tenants, { fields: [tenantMemberships.tenantId], references: [tenants.id] }),
  user: one(cpUsers, { fields: [tenantMemberships.userId], references: [cpUsers.id] }),
}));

export const tenantInvitationsRelations = relations(tenantInvitations, ({ one }) => ({
  tenant: one(tenants, { fields: [tenantInvitations.tenantId], references: [tenants.id] }),
  invitedBy: one(cpUsers, { fields: [tenantInvitations.invitedById], references: [cpUsers.id] }),
}));
