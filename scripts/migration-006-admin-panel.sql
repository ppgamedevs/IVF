-- Migration 006: Add admin panel tables and update leads table.
--
-- Creates clinics table and adds admin fields to leads table.

-- Create clinics table
CREATE TABLE IF NOT EXISTS clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  city TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for clinics
CREATE INDEX IF NOT EXISTS idx_clinics_active ON clinics (active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_clinics_city ON clinics (city);

-- Update leads table: add admin fields
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS assigned_clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE;

-- Update status column: ensure it supports new values
-- Note: status is TEXT, not ENUM, so we rely on application logic
-- Valid values: 'new', 'verified', 'assigned', 'sent', 'rejected', 'new_unverified' (legacy)

-- Indexes for admin queries
CREATE INDEX IF NOT EXISTS idx_leads_status_admin ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_clinic ON leads (assigned_clinic_id) WHERE assigned_clinic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_assigned_at ON leads (assigned_at DESC) WHERE assigned_at IS NOT NULL;

-- Verify
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'leads' 
--   AND column_name IN ('status', 'assigned_clinic_id', 'verified_at', 'assigned_at', 'sent_at', 'notes');
