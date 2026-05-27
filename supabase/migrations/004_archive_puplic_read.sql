-- ============================================================================
-- Migration 004 — allow authenticated users to read archived projects
-- ============================================================================
-- The original projects RLS in 001 restricted reads to members, supervisors,
-- and staff roles. This prevents the abstract-promised behaviour: students
-- can browse the institutional archive in read-only mode. This migration
-- adds a permissive read policy scoped to status = 'archived' only — in-flight
-- projects remain locked down.
-- ============================================================================

CREATE POLICY proj_read_archived ON public.projects
FOR SELECT TO authenticated
USING (status = 'archived');