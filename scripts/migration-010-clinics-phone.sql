-- Migration 010: Add phone to clinics for operator contact.
-- Safe to run (IF NOT EXISTS).

ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN clinics.phone IS 'Contact phone for the clinic';
