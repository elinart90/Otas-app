-- ============================================================================
-- Migration 020: Group-shared projects + group chat
-- ============================================================================
-- One project per group (submitted by the leader, visible to all members).
-- Messages are group-scoped so all members + supervisor share one thread.
-- ============================================================================

-- 1. Add group_id to projects (nullable — old projects without a group still work)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES student_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS projects_group_id_idx ON projects (group_id);

-- 2. Add group_id to project_messages for group-scoped threads
--    project_id stays for backward compat with old per-project messages
ALTER TABLE project_messages
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES student_groups(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS pm_group_id_idx ON project_messages (group_id);

-- 3. RLS: all members of a group can read group messages
CREATE POLICY "pm_group_member_select"
  ON project_messages FOR SELECT
  USING (
    group_id IS NOT NULL AND group_id IN (
      SELECT group_id FROM student_group_members WHERE user_id = auth.uid()
    )
  );

-- 4. RLS: group members can insert into their group thread
CREATE POLICY "pm_group_member_insert"
  ON project_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND group_id IS NOT NULL
    AND group_id IN (
      SELECT group_id FROM student_group_members WHERE user_id = auth.uid()
    )
  );

-- 5. RLS: supervisor of the group can read + insert into group messages
CREATE POLICY "pm_group_supervisor_select"
  ON project_messages FOR SELECT
  USING (
    group_id IS NOT NULL AND group_id IN (
      SELECT id FROM student_groups WHERE supervisor_id = auth.uid()
    )
  );

CREATE POLICY "pm_group_supervisor_insert"
  ON project_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND group_id IS NOT NULL
    AND group_id IN (
      SELECT id FROM student_groups WHERE supervisor_id = auth.uid()
    )
  );

-- 6. project_members: all group members see the group's project
--    (Existing RLS allows project members to see projects — we just need
--     to auto-add all group members when the project is created, handled in API.)

-- 7. Unique: one active project per group (prevent duplicate submissions)
CREATE UNIQUE INDEX IF NOT EXISTS projects_group_id_unique
  ON projects (group_id)
  WHERE group_id IS NOT NULL;
