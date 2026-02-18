-- Migration 000: Create leads table if it doesn't exist.
-- Run automatically on deploy. Safe for fresh DB or existing DB (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  age_range TEXT,
  tried_ivf TEXT,
  timeline TEXT,
  budget_range TEXT,
  city TEXT,
  message TEXT,
  gdpr_consent BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'new_unverified',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
