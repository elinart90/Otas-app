-- ============================================================================
-- Migration 017: Supervisor approval flow (Option B — self-register)
-- New supervisors register with is_active = FALSE.
-- Admin approves them (sets is_active = TRUE) before they can log in fully.
-- ============================================================================

-- No schema changes needed — is_active already exists on users.
-- This migration just documents the intent and adds a useful index.

CREATE INDEX IF NOT EXISTS idx_users_supervisor_pending
  ON users (role, is_active)
  WHERE role = 'supervisor';
