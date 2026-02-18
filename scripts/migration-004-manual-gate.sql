-- Migration 004: Add manual gate columns for lead verification workflow.
--
-- Adds verified_at and sent_at timestamps, and updates status enum
-- to support: new_unverified, verified, sent_to_clinic

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

-- Update status column to support new values
-- Note: PostgreSQL doesn't have native ENUM constraints in this setup,
-- so status is TEXT. We rely on application logic to enforce values:
-- 'new_unverified', 'verified', 'sent_to_clinic', 'new' (legacy)

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_verified_at ON leads (verified_at DESC) WHERE verified_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_sent_at ON leads (sent_at DESC) WHERE sent_at IS NOT NULL;

-- Verify
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'leads' AND column_name IN ('status', 'verified_at', 'sent_at');
