-- Migration 005: Add nurture sequence columns for low-intent lead automation.
--
-- Adds columns to track email nurture sequence stages and scheduling.
-- Low-intent leads (intent_level='low') receive 3 educational emails over 3 weeks.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS nurture_stage INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nurture_next_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS nurture_completed BOOLEAN NOT NULL DEFAULT false;

-- nurture_stage values:
--   0 = no nurture sequence started
--   1 = Email #1 sent (immediate)
--   2 = Email #2 sent (7 days after #1)
--   3 = Email #3 sent (14 days after #2)
--   After stage 3, nurture_completed = true

-- Indexes for cron query performance
CREATE INDEX IF NOT EXISTS idx_leads_nurture_next_at 
  ON leads (nurture_next_at) 
  WHERE nurture_completed = false AND nurture_next_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_intent_nurture 
  ON leads (intent_level, nurture_completed, nurture_next_at) 
  WHERE intent_level = 'low' AND nurture_completed = false;

-- Verify
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'leads' 
--   AND column_name IN ('nurture_stage', 'nurture_next_at', 'nurture_completed');
