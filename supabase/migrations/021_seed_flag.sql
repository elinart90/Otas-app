-- ============================================================================
-- Migration 021: is_seed flag on projects
-- ============================================================================
-- Marks test-corpus rows (inserted by migration 003) so they can be filtered
-- out of the archive management UI while remaining available for the title
-- similarity engine.
-- ============================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT FALSE;

-- Tag all existing seed rows. They are identifiable by two characteristics:
--   1. Their archives row has a placeholder:// document URL (never a real PDF)
--   2. Their abstract is the boilerplate corpus string from migration 003
UPDATE public.projects p
SET    is_seed = true
FROM   public.archives a
WHERE  a.project_id = p.id
  AND  a.document_url LIKE 'placeholder://%';

-- Belt-and-braces: also tag by the known seed abstract in case an archive row
-- was already replaced with a real PDF during testing.
UPDATE public.projects
SET    is_seed = true
WHERE  abstract = 'Sample archived project for similarity-check test corpus.'
  AND  is_seed  = false;

-- Index so the admin filter is instant even on large tables.
CREATE INDEX IF NOT EXISTS idx_projects_not_seed
  ON public.projects (status, created_at DESC)
  WHERE is_seed = false;
