-- Idempotent migration: pending invitations for users who don't have accounts yet.
-- Converted to project_users records when the invited email signs up.

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
