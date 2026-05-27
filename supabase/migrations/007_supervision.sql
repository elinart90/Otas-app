-- ============================================================================
-- Migration 007 — supervision sessions
-- ============================================================================
-- The supervisions and supervision_attachments tables already exist with RLS
-- from migration 001. This migration adds two narrow fixes that the actual
-- workflow needs:
--
-- 1. Supervisors can read project_members for their assigned projects so
--    the session form can display "Student: <name>".
--
-- 2. Index for fast "sessions this month" counts on the supervisor dashboard.
-- ============================================================================

-- ----- RLS: supervisor can read project_members of their projects -----

DROP POLICY IF EXISTS pm_read_supervisor ON public.project_members;
CREATE POLICY pm_read_supervisor ON public.project_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_members.project_id
        AND p.supervisor_id = auth.uid()
    )
  );

-- ----- RLS: supervisor can also read user profile info of their students -----
-- The user-table RLS already allows staff to read all users via users_read_staff,
-- so this is a no-op for supervisor role. Confirming it works as expected.

-- ----- Index for "sessions this month" dashboard query -----

CREATE INDEX IF NOT EXISTS idx_supervisions_supervisor_date
  ON public.supervisions(supervisor_id, session_date DESC);
