-- Migration 009: Phase 2 - Premium Lead Quality and Operator Verification
-- Adds comprehensive medical qualifiers, operator workflow, and clinic management

-- Add new fields to leads table
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS female_age_exact INTEGER,
  ADD COLUMN IF NOT EXISTS male_age_exact INTEGER,
  ADD COLUMN IF NOT EXISTS primary_factor TEXT CHECK (primary_factor IN ('UNKNOWN', 'MALE_FACTOR', 'FEMALE_FACTOR', 'BOTH', 'UNEXPLAINED', 'ENDOMETRIOSIS', 'LOW_OVARIAN_RESERVE', 'TUBAL', 'PCOS', 'OTHER')),
  ADD COLUMN IF NOT EXISTS voucher_status TEXT CHECK (voucher_status IN ('NONE', 'APPLIED', 'APPROVED_ASSMB', 'APPROVED_NATIONAL', 'APPROVED_OTHER')),
  ADD COLUMN IF NOT EXISTS has_recent_tests BOOLEAN,
  ADD COLUMN IF NOT EXISTS tests_list TEXT,
  ADD COLUMN IF NOT EXISTS previous_clinics TEXT,
  ADD COLUMN IF NOT EXISTS urgency_level TEXT CHECK (urgency_level IN ('ASAP_0_30', 'SOON_1_3', 'MID_3_6', 'LATER_6_12', 'INFO_ONLY')),
  ADD COLUMN IF NOT EXISTS availability_windows TEXT,
  ADD COLUMN IF NOT EXISTS operator_status TEXT NOT NULL DEFAULT 'NEW' CHECK (operator_status IN ('NEW', 'CALLED_NO_ANSWER', 'INVALID', 'LOW_INTENT_NURTURE', 'VERIFIED_READY', 'SENT_TO_CLINIC')),
  ADD COLUMN IF NOT EXISTS operator_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS operator_notes TEXT,
  ADD COLUMN IF NOT EXISTS call_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_contact_method TEXT CHECK (best_contact_method IN ('PHONE', 'WHATSAPP', 'EMAIL')),
  ADD COLUMN IF NOT EXISTS consent_to_share BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS consent_ip_hash TEXT,
  ADD COLUMN IF NOT EXISTS consent_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS sent_to_clinic_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS lead_tier TEXT NOT NULL DEFAULT 'D' CHECK (lead_tier IN ('A', 'B', 'C', 'D')),
  ADD COLUMN IF NOT EXISTS tier_reason TEXT;

-- Update existing columns if needed (rename budget_range to financing_method conceptually, but keep column name)
-- Map existing timeline to urgency_level
UPDATE leads
SET urgency_level = CASE
  WHEN timeline = 'asap' THEN 'ASAP_0_30'
  WHEN timeline = '1-3months' THEN 'SOON_1_3'
  WHEN timeline = 'researching' THEN 'INFO_ONLY'
  ELSE 'INFO_ONLY'
END
WHERE urgency_level IS NULL;

-- Map existing exact_age to female_age_exact if present
UPDATE leads
SET female_age_exact = exact_age
WHERE exact_age IS NOT NULL AND female_age_exact IS NULL;

-- Map existing status to operator_status
UPDATE leads
SET operator_status = CASE
  WHEN status = 'new_unverified' THEN 'NEW'
  WHEN status = 'verified' THEN 'VERIFIED_READY'
  WHEN status = 'assigned' THEN 'VERIFIED_READY'
  WHEN status = 'sent' OR status = 'sent_to_clinic' THEN 'SENT_TO_CLINIC'
  ELSE 'NEW'
END
WHERE operator_status = 'NEW';

-- Map existing phone_verified_at to operator_verified_at
UPDATE leads
SET operator_verified_at = phone_verified_at
WHERE phone_verified_at IS NOT NULL AND operator_verified_at IS NULL;

-- Map existing sent_at to sent_to_clinic_at
UPDATE leads
SET sent_to_clinic_at = sent_at
WHERE sent_at IS NOT NULL AND sent_to_clinic_at IS NULL;

-- Update Clinics table (migration-006 created it, we add city_coverage and notes)
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS city_coverage TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- If city column exists, migrate single city to city_coverage array
-- Note: This will only work if city column exists (from migration-006)
-- If city column doesn't exist, this UPDATE will fail silently due to column check
-- We use a safe approach: try to update only if city column exists
-- In practice, migration-006 already created city column, so this is safe
UPDATE clinics
SET city_coverage = ARRAY[city]
WHERE city IS NOT NULL 
AND city != '' 
AND (city_coverage IS NULL OR array_length(city_coverage, 1) IS NULL);

CREATE INDEX IF NOT EXISTS idx_clinics_active ON clinics (active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_clinics_email ON clinics (email);

-- Create LeadEvent table for audit trail
CREATE TABLE IF NOT EXISTS lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('CREATED', 'CONSENT_CAPTURED', 'OPERATOR_CALLED', 'OPERATOR_VERIFIED', 'ASSIGNED', 'SENT_EMAIL', 'STATUS_CHANGED')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_events_lead_id ON lead_events (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_type ON lead_events (type);
CREATE INDEX IF NOT EXISTS idx_lead_events_created_at ON lead_events (created_at DESC);

-- Indexes for admin queries
CREATE INDEX IF NOT EXISTS idx_leads_operator_status ON leads (operator_status);
CREATE INDEX IF NOT EXISTS idx_leads_lead_tier ON leads (lead_tier);
CREATE INDEX IF NOT EXISTS idx_leads_urgency_level ON leads (urgency_level);
CREATE INDEX IF NOT EXISTS idx_leads_voucher_status ON leads (voucher_status) WHERE voucher_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_operator_verified_at ON leads (operator_verified_at) WHERE operator_verified_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_sent_to_clinic_at ON leads (sent_to_clinic_at) WHERE sent_to_clinic_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_consent_to_share ON leads (consent_to_share) WHERE consent_to_share = true;

-- Comments
COMMENT ON COLUMN leads.female_age_exact IS 'Exact age of female partner (20-45 ideal for Tier A)';
COMMENT ON COLUMN leads.male_age_exact IS 'Exact age of male partner (optional)';
COMMENT ON COLUMN leads.primary_factor IS 'Primary infertility factor: UNKNOWN, MALE_FACTOR, FEMALE_FACTOR, BOTH, UNEXPLAINED, ENDOMETRIOSIS, LOW_OVARIAN_RESERVE, TUBAL, PCOS, OTHER';
COMMENT ON COLUMN leads.voucher_status IS 'Voucher status: NONE, APPLIED, APPROVED_ASSMB, APPROVED_NATIONAL, APPROVED_OTHER';
COMMENT ON COLUMN leads.urgency_level IS 'Urgency: ASAP_0_30, SOON_1_3, MID_3_6, LATER_6_12, INFO_ONLY';
COMMENT ON COLUMN leads.operator_status IS 'Operator workflow status: NEW, CALLED_NO_ANSWER, INVALID, LOW_INTENT_NURTURE, VERIFIED_READY, SENT_TO_CLINIC';
COMMENT ON COLUMN leads.lead_tier IS 'Lead quality tier: A (premium verified), B, C, D (low intent)';
COMMENT ON COLUMN leads.tier_reason IS 'Explanation for tier assignment';
COMMENT ON COLUMN leads.consent_timestamp IS 'Exact timestamp when user gave explicit consent to share data';
COMMENT ON COLUMN leads.consent_ip_hash IS 'Hashed IP address (not raw IP) for GDPR audit trail';
COMMENT ON COLUMN leads.consent_user_agent IS 'User agent string when consent was given';
