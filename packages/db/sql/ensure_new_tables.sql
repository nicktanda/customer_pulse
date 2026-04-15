-- Idempotent migration: project_invitations + project_settings tables.
-- Run via: node --env-file=.env scripts/ensure-projects-membership-tables.mjs

-- Pending invitations for users who don't have accounts yet.
CREATE TABLE IF NOT EXISTS "project_invitations" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "project_id" bigint NOT NULL,
  "email" varchar(255) NOT NULL,
  "invited_by_id" bigint NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "index_project_invitations_on_project_id_and_email"
  ON "project_invitations" USING btree ("project_id", "email");
CREATE INDEX IF NOT EXISTS "index_project_invitations_on_email"
  ON "project_invitations" USING btree ("email");

-- Per-project settings (pulse time, AI interval, defaults).
CREATE TABLE IF NOT EXISTS "project_settings" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "project_id" bigint NOT NULL,
  "pulse_send_time" varchar(10) NOT NULL DEFAULT '09:00',
  "ai_processing_interval_hours" integer NOT NULL DEFAULT 4,
  "default_priority" varchar(20) NOT NULL DEFAULT 'unset',
  "auto_archive_days" integer NOT NULL DEFAULT 30,
  "github_auto_merge" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "index_project_settings_on_project_id"
  ON "project_settings" USING btree ("project_id");
