-- ============================================================================
-- Migration 010 — archive phase
-- ============================================================================
-- Adds Phase 3 capabilities on top of the existing archive infrastructure:
--
-- 1. Storage policy: any authenticated user can READ from the `archives`
--    bucket (for viewing archived PDFs via signed URLs). Only admins
--    can WRITE/DELETE (for the upload workflow).
--
-- 2. Indexes for the search/filter queries.
--
-- 3. Audit table for tracking who viewed which archive when (defensible at
--    viva: "we log every read for accountability").
-- ============================================================================

-- ----- Archive storage bucket policies -----
-- The bucket itself was created in Phase 1B. Migration 002 added basic
-- policies; this migration ensures the read/write split is correct.

DROP POLICY IF EXISTS archives_read_authenticated ON storage.objects;
CREATE POLICY archives_read_authenticated ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'archives');

DROP POLICY IF EXISTS archives_write_admin ON storage.objects;
CREATE POLICY archives_write_admin ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'archives'
    AND public.current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS archives_delete_admin ON storage.objects;
CREATE POLICY archives_delete_admin ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'archives'
    AND public.current_user_role() = 'admin'
  );

-- ----- Search indexes -----
-- These speed up the common archive-browsing filter combinations.

CREATE INDEX IF NOT EXISTS idx_projects_archived_year
  ON public.projects(academic_year DESC, programme_id)
  WHERE status = 'archived';

CREATE INDEX IF NOT EXISTS idx_projects_archived_title_trgm
  ON public.projects USING gin (title gin_trgm_ops)
  WHERE status = 'archived';

-- Required extension for the trigram index above
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ----- Audit table for archive views -----
-- Tracks every access for accountability. Read-only from app side; we only
-- insert via the API. RLS allows the user to read their OWN view history,
-- and admins can read all.

CREATE TABLE IF NOT EXISTS public.archive_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  archive_id UUID NOT NULL REFERENCES public.archives(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_archive_views_archive_time
  ON public.archive_views(archive_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_archive_views_user_time
  ON public.archive_views(user_id, viewed_at DESC);

ALTER TABLE public.archive_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS av_insert_self ON public.archive_views;
CREATE POLICY av_insert_self ON public.archive_views
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS av_read_self ON public.archive_views;
CREATE POLICY av_read_self ON public.archive_views
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS av_read_admin ON public.archive_views;
CREATE POLICY av_read_admin ON public.archive_views
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'hod'));
