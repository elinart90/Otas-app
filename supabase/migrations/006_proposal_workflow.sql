-- ============================================================================
-- Migration 006 — proposal workflow
-- ============================================================================
-- Adds two things needed for the project proposal submission flow:
--
-- 1. RLS policy so students can read their OWN projects (created_by = self)
--    even before they're formally added to project_members. The existing
--    proj_read_member policy from 001 only fires after team membership.
--
-- 2. Storage policies on the `project-documents` bucket so:
--    - Students can upload their own proposal PDFs (under <user_id>/...)
--    - Supervisors can read proposal PDFs for projects assigned to them
--    - Admins can write/read all (archive uploads — Phase 3)
--
-- 3. Index on projects.created_by since student dashboards query by it.
-- ============================================================================

-- ----- RLS: student reads their own projects -----

DROP POLICY IF EXISTS proj_read_creator ON public.projects;
CREATE POLICY proj_read_creator ON public.projects
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

-- ----- Storage: project-documents bucket policies -----
-- Path convention: <user_id>/<timestamp>-<filename>.pdf

-- Drop any existing policies with these names so the migration is rerunnable
DROP POLICY IF EXISTS project_docs_student_upload ON storage.objects;
DROP POLICY IF EXISTS project_docs_student_read_own ON storage.objects;
DROP POLICY IF EXISTS project_docs_supervisor_read ON storage.objects;

-- Students upload to their own folder
CREATE POLICY project_docs_student_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Students read their own documents
CREATE POLICY project_docs_student_read_own ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Supervisors and HoD/admin can read all project-documents
CREATE POLICY project_docs_supervisor_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND public.current_user_role() IN ('supervisor', 'panel', 'hod', 'admin')
  );

-- Students delete their own un-archived documents (for re-upload during draft)
DROP POLICY IF EXISTS project_docs_student_delete ON storage.objects;
CREATE POLICY project_docs_student_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----- Index for student dashboards -----

CREATE INDEX IF NOT EXISTS idx_projects_created_by
  ON public.projects(created_by);

-- ----- Helper view for supervisor queue (optional, simplifies queries) -----
-- A project shows up in a supervisor's queue when they are the requested
-- supervisor AND the status is 'proposal_submitted'.

CREATE OR REPLACE VIEW public.supervisor_pending_proposals AS
SELECT
  p.id,
  p.title,
  p.abstract,
  p.academic_year,
  p.status,
  p.created_at,
  p.proposal_doc_url,
  p.created_by,
  u.full_name AS author_name,
  u.email AS author_email,
  u.index_number AS author_index_number
FROM public.projects p
JOIN public.users u ON u.id = p.created_by
WHERE p.status = 'proposal_submitted';
-- Views inherit RLS from their underlying tables, so this is safe.
