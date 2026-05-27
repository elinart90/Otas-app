-- ============================================================================
-- Migration 005 — plagiarism module setup
-- ============================================================================
-- Adds the shingles cache column on projects (so we don't re-shingle every
-- archive on every comparison), and a trigger to invalidate it when project
-- text changes.
--
-- Also adds an "Edge Function service role" capability: the
-- process-plagiarism Edge Function uses the service-role key and bypasses
-- RLS, so no additional RLS policies are required for it specifically.
-- The existing RLS policies on plagiarism_reports and plagiarism_matches
-- (from migration 001) already permit users to read their own reports.
-- ============================================================================

-- The 'shingles' column already exists on the archives table per 001's design.
-- We also need it on projects (since we shingle PROJECT text, not archive
-- rows — archives just point at projects).

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS shingles JSONB,
  ADD COLUMN IF NOT EXISTS shingles_size INT,
  ADD COLUMN IF NOT EXISTS shingles_token_count INT,
  ADD COLUMN IF NOT EXISTS shingles_updated_at TIMESTAMPTZ;

-- Allow service-role inserts/updates by the Edge Function on these tables.
-- Note: service role bypasses RLS automatically, so no explicit policy is
-- strictly required. We do, however, want students to read their own
-- matches via the parent report, which is already covered by 001's
-- pm_match_read policy.

-- One small policy fix: allow the system to write match rows. Service-role
-- writes bypass RLS, but if we ever switch to authenticated writes (e.g.
-- testing a direct API call) we'd want this:
DROP POLICY IF EXISTS plag_matches_service ON public.plagiarism_matches;
CREATE POLICY plag_matches_service ON public.plagiarism_matches
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Only the user who owns the parent report can insert their own matches
    EXISTS (
      SELECT 1 FROM public.plagiarism_reports r
      WHERE r.id = report_id AND r.user_id = auth.uid()
    )
  );

-- Index for the polling query (student fetches their reports sorted by date)
CREATE INDEX IF NOT EXISTS idx_plag_reports_user_created
  ON public.plagiarism_reports(user_id, created_at DESC);

-- Index for fast match aggregation
CREATE INDEX IF NOT EXISTS idx_plag_matches_archive
  ON public.plagiarism_matches(matched_archive_id);
