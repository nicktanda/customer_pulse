-- Idempotent migration: specs + spec_insights tables.
-- specs is the core Build primitive. spec_insights is the "golden thread" join table
-- linking each spec back to the insights that motivated it.
-- Safe to run multiple times — uses CREATE TABLE IF NOT EXISTS and CREATE INDEX IF NOT EXISTS.

-- Core spec rows. status is stored as an integer aligned with the SpecStatus enum:
--   0=backlog  1=drafting  2=review  3=ready  4=in_progress  5=shipped
CREATE TABLE IF NOT EXISTS "specs" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "project_id" bigint NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "user_stories" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "acceptance_criteria" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "status" integer NOT NULL DEFAULT 0,
  "effort_score" double precision,
  "impact_score" double precision,
  "ai_generated" boolean NOT NULL DEFAULT false,
  "created_by" bigint NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS "index_specs_on_project_id"
  ON "specs" USING btree ("project_id");
CREATE INDEX IF NOT EXISTS "index_specs_on_created_by"
  ON "specs" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "index_specs_on_status"
  ON "specs" USING btree ("status");

-- Join table linking specs to the insights they originated from (the golden thread).
CREATE TABLE IF NOT EXISTS "spec_insights" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "spec_id" bigint NOT NULL,
  "insight_id" bigint NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "index_spec_insights_on_spec_id_and_insight_id"
  ON "spec_insights" USING btree ("spec_id", "insight_id");
CREATE INDEX IF NOT EXISTS "index_spec_insights_on_spec_id"
  ON "spec_insights" USING btree ("spec_id");
CREATE INDEX IF NOT EXISTS "index_spec_insights_on_insight_id"
  ON "spec_insights" USING btree ("insight_id");
