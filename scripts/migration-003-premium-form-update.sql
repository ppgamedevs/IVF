-- Migration 003: Update for premium form conversion upgrade.
--
-- Changes:
--   1. intent_level now has 3 tiers: 'high', 'medium', 'low' (was binary)
--   2. age_range options changed: 'under-30','30-34','35-37','38-40','41+' (was '18-24','25-29','30-34','35-37','38-40','41+')
--   3. tried_ivf now accepts 'Yes','No','InProgress' (was 'Yes','No')
--   4. budget_range options changed to LEI: 'under-10k','10k-20k','over-20k','prefer-discuss' (was EUR-based)
--
-- No schema changes needed: all columns are TEXT type.
-- This file documents the data format change for reference.

COMMENT ON COLUMN leads.intent_level IS 'high = (ASAP/1-3mo + budget known), medium = (ASAP/1-3mo + prefer-discuss), low = researching';
COMMENT ON COLUMN leads.budget_range IS 'under-10k | 10k-20k | over-20k | prefer-discuss (in RON/lei)';
COMMENT ON COLUMN leads.tried_ivf IS 'Yes | No | InProgress';
COMMENT ON COLUMN leads.age_range IS 'under-30 | 30-34 | 35-37 | 38-40 | 41+';
