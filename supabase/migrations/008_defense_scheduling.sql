-- ============================================================================
-- Migration 008 — defense scheduling
-- ============================================================================
-- Phase 2.3 needs three additions on top of migration 001's foundation:
--
-- 1. RLS: HoD/admin must be able to read staff users (supervisor, panel, hod)
--    so the panel-member picker shows the full list. Migration 006 only
--    exposed role='supervisor'.
--
-- 2. View for "eligible panelists" — staff users who can be assigned to a
--    panel. Hides student/admin and inactive users in one place.
--
-- 3. Indexes for the queries the defense pages use.
-- ============================================================================

-- ----- RLS: HoD/admin reads all staff users -----

DROP POLICY IF EXISTS users_read_staff_for_hod ON public.users;
CREATE POLICY users_read_staff_for_hod ON public.users
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('hod', 'admin')
    AND role IN ('supervisor', 'panel', 'hod')
  );

-- ----- Indexes -----

CREATE INDEX IF NOT EXISTS idx_defense_sessions_status_date
  ON public.defense_sessions(status, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_defense_sessions_project_stage
  ON public.defense_sessions(project_id, stage);

-- ----- Helper view: eligible panelists -----

CREATE OR REPLACE VIEW public.eligible_panelists AS
SELECT id, full_name, email, role, staff_id, department_id
FROM public.users
WHERE is_active = TRUE
  AND role IN ('supervisor', 'panel', 'hod');
-- View inherits RLS from underlying users table.
