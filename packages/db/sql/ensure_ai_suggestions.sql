-- Idempotent rollout for ai_suggestions audit table.
-- Used by Infra-4 of the AI-native overhaul.
-- Apply with: psql $DATABASE_URL -f packages/db/sql/ensure_ai_suggestions.sql

CREATE TABLE IF NOT EXISTS "ai_suggestions" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "project_id" bigint NOT NULL,
  "kind" varchar(64) NOT NULL,
  "target_table" varchar(64),
  "target_id" bigint,
  "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "confidence" double precision,
  "accepted_at" timestamp with time zone,
  "accepted_by" bigint,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "index_ai_suggestions_on_project_id" ON "ai_suggestions" USING btree ("project_id");
CREATE INDEX IF NOT EXISTS "index_ai_suggestions_on_kind" ON "ai_suggestions" USING btree ("kind");
CREATE INDEX IF NOT EXISTS "index_ai_suggestions_on_target" ON "ai_suggestions" USING btree ("target_table","target_id");

-- Cross-cut D: tags + feedback_tags (auto-tag corpus from human examples).
CREATE TABLE IF NOT EXISTS "tags" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "project_id" bigint NOT NULL,
  "name" varchar(128) NOT NULL,
  "color" varchar(32),
  "created_by" bigint,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "index_tags_on_project_id_and_name" ON "tags" USING btree ("project_id","name");
CREATE INDEX IF NOT EXISTS "index_tags_on_project_id" ON "tags" USING btree ("project_id");

CREATE TABLE IF NOT EXISTS "feedback_tags" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "feedback_id" bigint NOT NULL,
  "tag_id" bigint NOT NULL,
  -- 'human' = manually applied, 'ai' = proposed by Claude. Used for the auto-tag worker job.
  "source" varchar(16) NOT NULL DEFAULT 'human',
  "confidence" double precision,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "index_feedback_tags_on_feedback_id_and_tag_id" ON "feedback_tags" USING btree ("feedback_id","tag_id");
CREATE INDEX IF NOT EXISTS "index_feedback_tags_on_tag_id" ON "feedback_tags" USING btree ("tag_id");

-- Item 10: per-recipient digest filtering + tone preferences.
ALTER TABLE "email_recipients" ADD COLUMN IF NOT EXISTS "filters" jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "email_recipients" ADD COLUMN IF NOT EXISTS "preferences" jsonb NOT NULL DEFAULT '{}'::jsonb;
