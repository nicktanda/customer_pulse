-- Idempotent rollout for Strategy + Reporting NL tables/columns.
-- Use when the DB was created outside Drizzle migrate (e.g. legacy Rails) or migrate journal is out of sync.
-- Matches packages/db/src/schema.ts and drizzle/0001_strategy_reporting.sql.

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "business_objectives" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "business_strategy" text;

CREATE TABLE IF NOT EXISTS "teams" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"objectives" text,
	"strategy" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS "index_teams_on_project_id" ON "teams" USING btree ("project_id");

CREATE TABLE IF NOT EXISTS "reporting_requests" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"prompt" text NOT NULL,
	"output_mode" integer DEFAULT 0 NOT NULL,
	"status" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"result_markdown" text,
	"result_structured" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS "index_reporting_requests_on_project_id_and_created_at" ON "reporting_requests" USING btree ("project_id","created_at");
CREATE INDEX IF NOT EXISTS "index_reporting_requests_on_user_id" ON "reporting_requests" USING btree ("user_id");
