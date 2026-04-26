-- Stage 5: opportunity–solution map — root goal text on the project (read-first tree top node).
-- Idempotent. Default empty object. See `projects.ost_map_root` in `packages/db/src/schema.ts`.

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "ost_map_root" jsonb NOT NULL DEFAULT '{}'::jsonb;
