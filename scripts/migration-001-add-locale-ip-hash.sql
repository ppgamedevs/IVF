-- Migration 001: Add locale, ip_hash, and intent_level columns to leads table.
--
-- Run this against your Neon database before deploying the updated API route.
-- You can execute it via:
--   - Neon Console > SQL Editor
--   - psql CLI
--   - Any Postgres client connected to your DATABASE_URL
--
-- These columns are safe to add to a live table (no locks, no rewrites)
-- because they use DEFAULT values and allow NULL for existing rows.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'ro',
  ADD COLUMN IF NOT EXISTS ip_hash TEXT,
  ADD COLUMN IF NOT EXISTS intent_level TEXT NOT NULL DEFAULT 'high';

-- Intent values: 'high' (asap), 'medium' (1-3months), 'low' (researching)
-- Business rule: 'low' leads can be routed to nurturing / cheaper pipelines.

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_ip_hash ON leads (ip_hash);
CREATE INDEX IF NOT EXISTS idx_leads_locale ON leads (locale);
CREATE INDEX IF NOT EXISTS idx_leads_intent_level ON leads (intent_level);

-- Verify
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'leads'
-- ORDER BY ordinal_position;
