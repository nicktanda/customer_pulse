-- Idempotent migration: skills table.
-- Skills are named, reusable AI agent prompts scoped to a user and optionally a project.
-- Safe to run multiple times — uses CREATE TABLE IF NOT EXISTS and CREATE INDEX IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS "skills" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "content" text NOT NULL,
  "user_id" bigint NOT NULL,
  "project_id" bigint,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "index_skills_on_name"
  ON "skills" USING btree ("name");
CREATE INDEX IF NOT EXISTS "index_skills_on_user_id"
  ON "skills" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "index_skills_on_project_id"
  ON "skills" USING btree ("project_id");
