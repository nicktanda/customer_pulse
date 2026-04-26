-- Stage 4: insight-level discovery process stage (nullable-safe default: framing = 1).
-- Idempotent — safe on existing DBs. See `packages/db/src/enums.ts` (DiscoveryInsightStage).

ALTER TABLE "insights" ADD COLUMN IF NOT EXISTS "discovery_stage" integer NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS "index_insights_on_discovery_stage" ON "insights" USING btree ("discovery_stage");
