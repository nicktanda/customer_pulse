-- Idempotent: safe when some tables already exist (e.g. mixed Rails + Drizzle state).
-- Matches Drizzle schema in packages/db/src/schema.ts for `projects` and `project_users`.

CREATE TABLE IF NOT EXISTS "projects" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"slug" varchar(255) NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "index_projects_on_slug" ON "projects" USING btree ("slug");

CREATE TABLE IF NOT EXISTS "project_users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"invited_by_id" bigint,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"is_owner" boolean DEFAULT false NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "index_project_users_on_project_id_and_user_id" ON "project_users" USING btree ("project_id","user_id");
CREATE INDEX IF NOT EXISTS "index_project_users_on_project_id" ON "project_users" USING btree ("project_id");
CREATE INDEX IF NOT EXISTS "index_project_users_on_user_id" ON "project_users" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "index_project_users_on_invited_by_id" ON "project_users" USING btree ("invited_by_id");
