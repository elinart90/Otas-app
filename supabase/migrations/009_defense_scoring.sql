-- ============================================================================
-- Migration 009 — defense scoring
-- ============================================================================
-- Most of the scoring schema (rubric_criteria, defense_scores, RLS policies)
-- is already in migration 001. This migration adds only:
--
-- 1. A `decision_notes` column on defense_sessions for the HoD's reasoning.
--    The existing `hod_decision` column holds the pass/fail verdict.
-- 2. Index for aggregation queries used by HoD review.
-- ============================================================================

ALTER TABLE public.defense_sessions
  ADD COLUMN IF NOT EXISTS decision_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_defense_scores_defense
  ON public.defense_scores(defense_id, submitted);
