-- Stage 3: insight-level discovery lead + activity assignee (nullable bigints).
-- Idempotent — safe to run on existing DBs. See `packages/db/src/schema.ts`.

ALTER TABLE "insights" ADD COLUMN IF NOT EXISTS "discovery_lead_id" bigint;
CREATE INDEX IF NOT EXISTS "index_insights_on_discovery_lead_id" ON "insights" USING btree ("discovery_lead_id");

ALTER TABLE "discovery_activities" ADD COLUMN IF NOT EXISTS "assignee_id" bigint;
CREATE INDEX IF NOT EXISTS "index_discovery_activities_on_assignee_id" ON "discovery_activities" USING btree ("assignee_id");
