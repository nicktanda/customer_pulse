-- Adds the three AI-generated spec section columns to the specs table.
-- Safe to run multiple times (ADD COLUMN IF NOT EXISTS).
-- Apply with: psql $DATABASE_URL -f packages/db/sql/ensure_spec_ai_columns.sql

ALTER TABLE specs
  ADD COLUMN IF NOT EXISTS success_metrics jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS out_of_scope    jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS risks           jsonb NOT NULL DEFAULT '[]';
