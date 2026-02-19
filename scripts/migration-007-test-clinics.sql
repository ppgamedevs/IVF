-- Migration 007: Add test clinics for admin panel testing.
--
-- Adds two test clinics to the clinics table for testing clinic assignment functionality.

INSERT INTO clinics (name, email, city, active)
VALUES 
  ('Clinica Test București', 'test-bucuresti@fivmatch.ro', 'București', true),
  ('Clinica Test Cluj', 'test-cluj@fivmatch.ro', 'Cluj-Napoca', true)
ON CONFLICT DO NOTHING;

-- Verify
-- SELECT id, name, email, city, active FROM clinics WHERE name LIKE 'Clinica Test%';
