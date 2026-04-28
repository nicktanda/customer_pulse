-- Optional link from an insight to a project `teams` row (Strategy tab). Shown on the discovery map.
-- Idempotent — safe on existing DBs. See `packages/db/src/schema.ts` (`insights.team_id`).

ALTER TABLE "insights" ADD COLUMN IF NOT EXISTS "team_id" bigint;
CREATE INDEX IF NOT EXISTS "index_insights_on_team_id" ON "insights" USING btree ("team_id");
