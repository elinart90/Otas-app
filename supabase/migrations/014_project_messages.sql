-- ============================================================================
-- Migration 014: Project-scoped messaging between students and supervisors
-- ============================================================================
-- Run in: Supabase Dashboard → SQL Editor → New Query → paste → Run
-- ============================================================================

CREATE TABLE project_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id)  ON DELETE CASCADE,
  sender_id   UUID        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  content     TEXT        NOT NULL,
  is_action   BOOLEAN     NOT NULL DEFAULT false,   -- supervisor can pin as "action item"
  is_read     BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pm_content_length CHECK (char_length(content) BETWEEN 1 AND 4000)
);

-- Indexes for fast per-project queries
CREATE INDEX project_messages_project_id_idx ON project_messages (project_id);
CREATE INDEX project_messages_created_at_idx ON project_messages (created_at DESC);

-- ── Row-level security ───────────────────────────────────────────────────────
ALTER TABLE project_messages ENABLE ROW LEVEL SECURITY;

-- Students can SELECT messages on their own projects
CREATE POLICY "pm_student_select"
  ON project_messages FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- Supervisors can SELECT messages on their assigned projects
CREATE POLICY "pm_supervisor_select"
  ON project_messages FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE supervisor_id = auth.uid()
    )
  );

-- Students can INSERT on their own projects (sender_id must equal caller)
CREATE POLICY "pm_student_insert"
  ON project_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- Supervisors can INSERT on their assigned projects
CREATE POLICY "pm_supervisor_insert"
  ON project_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND project_id IN (
      SELECT id FROM projects WHERE supervisor_id = auth.uid()
    )
  );

-- Note: UPDATE (is_read marking) is handled server-side via the service-role
-- admin client in the API route — no user-level UPDATE policy needed.
