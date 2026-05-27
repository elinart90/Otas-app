-- ============================================================================
-- Migration 011 — supervisor archive upload
-- ============================================================================
-- Phase 3.1 narrowly extends the archive write capability to supervisors
-- so they can submit the FINAL approved PDF for their own students' projects
-- to the institutional archive. This mirrors UMaT practice where the
-- supervising lecturer hands the bound final report to the department
-- registry.
--
-- The widening is strictly scoped:
--   * Only paths under <year>/<archive_code>.pdf in the `archives` bucket
--   * Only for projects where auth.uid() = projects.supervisor_id
--   * Only when projects.status IN ('final_passed', 'archived')
--
-- Storage policies cannot directly reference other tables in a clean way,
-- so we accept that the API route is the primary enforcement boundary and
-- the storage policy is a backstop. This is documented at viva: defence in
-- depth, with API as primary.
-- ============================================================================

-- Drop and recreate the write policy with the wider role check.
-- Both admins (Phase 3) AND supervisors can now write — but the API route
-- for supervisor-upload checks ownership separately and uses a service-role
-- client for the actual storage write to bypass this policy. The storage
-- policy below remains the last line of defence: only authenticated users
-- with role in (admin, supervisor) may write to the archives bucket.

DROP POLICY IF EXISTS archives_write_admin ON storage.objects;
DROP POLICY IF EXISTS archives_write_admin_or_supervisor ON storage.objects;
CREATE POLICY archives_write_admin_or_supervisor ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'archives'
    AND public.current_user_role() IN ('admin', 'supervisor')
  );

-- Updates use the same role gate. We keep admins able to delete; supervisors
-- cannot delete (they can only ADD, not REMOVE, archive entries — important
-- for audit integrity).
DROP POLICY IF EXISTS archives_delete_admin ON storage.objects;
CREATE POLICY archives_delete_admin ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'archives'
    AND public.current_user_role() = 'admin'
  );

-- Update policy for the archives bucket (replace existing file) — admin only.
-- Supervisors may not overwrite existing archives. Mistakes are an admin's
-- job to clean up.
DROP POLICY IF EXISTS archives_update_admin ON storage.objects;
CREATE POLICY archives_update_admin ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'archives'
    AND public.current_user_role() = 'admin'
  );
