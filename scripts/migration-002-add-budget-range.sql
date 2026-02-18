-- Migration 002: Add budget_range column to leads table.
--
-- Run this against your Neon database before deploying the updated API route.
-- Safe to add to a live table — uses DEFAULT and allows NULL for existing rows.
--
-- Budget values: 'under-3k', '3k-5k', '5k-10k', 'over-10k'

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS budget_range TEXT;

-- Also update the intent_level comment: now binary (high/low)
-- 'high' = asap or 1-3months
-- 'low'  = researching (nurturing pipeline)
COMMENT ON COLUMN leads.intent_level IS 'high = ASAP or 1-3 months, low = researching (nurturing)';
COMMENT ON COLUMN leads.budget_range IS 'Estimated treatment budget: under-3k, 3k-5k, 5k-10k, over-10k';

-- Verify
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'leads'
-- ORDER BY ordinal_position;
