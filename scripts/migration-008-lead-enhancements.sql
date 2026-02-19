-- Migration 008: Add enhanced lead fields for better clinic value.
--
-- Adds fields for exact age, financing method, test status, and phone verification.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS exact_age INTEGER,
  ADD COLUMN IF NOT EXISTS financing_method TEXT,
  ADD COLUMN IF NOT EXISTS test_status TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE;

-- financing_method values: 'own-funds', 'state-program', 'medical-credit', 'prefer-discuss'
-- test_status values: 'ready', 'pending', 'not-started', 'unknown'

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_financing_method ON leads (financing_method);
CREATE INDEX IF NOT EXISTS idx_leads_test_status ON leads (test_status);
CREATE INDEX IF NOT EXISTS idx_leads_phone_verified ON leads (phone_verified_at) WHERE phone_verified_at IS NOT NULL;

-- Verify
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'leads' 
--   AND column_name IN ('exact_age', 'financing_method', 'test_status', 'phone_verified_at');
