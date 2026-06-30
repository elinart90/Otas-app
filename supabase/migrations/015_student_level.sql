-- ============================================================================
-- Migration 015: Add is_final_year to users
-- Derived from index_number last-two-digit admission year.
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_final_year BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill existing student rows
UPDATE users
SET is_final_year = (
  EXTRACT(YEAR FROM NOW())::INT
  - (2000 + (regexp_match(index_number, '\.(\d{2})$'))[1]::INT)
) >= 4
WHERE role = 'student'
  AND index_number IS NOT NULL
  AND index_number ~ '\.\d{2}$';

-- Index for fast middleware look-ups (role + is_final_year)
CREATE INDEX IF NOT EXISTS idx_users_role_final_year
  ON users (role, is_final_year);
