/**
 * DDL to align legacy `users` rows with packages/db Drizzle schema (OAuth + onboarding).
 * Used by ensure-users-schema.mjs and bootstrap-dev-user.mjs.
 */
export const USERS_TABLE_DDL = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS provider varchar(255)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS uid varchar(255)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url varchar(255)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_current_step varchar(255) DEFAULT 'welcome'`,
  `CREATE UNIQUE INDEX IF NOT EXISTS index_users_on_provider_and_uid ON users (provider, uid)`,
];
