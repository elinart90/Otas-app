-- ============================================================================
-- Migration 016: Group system
-- Admin uploads course-rep groupings. Group leaders create groups.
-- Max 5 members per group. One group per academic year.
-- ============================================================================

-- ── Admin roster (uploaded from course-rep lists) ─────────────────────────
-- Stores index numbers only — members may not have registered yet.
CREATE TABLE admin_group_roster (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year INT     NOT NULL,
  group_number  INT     NOT NULL,
  leader_index  TEXT    NOT NULL,          -- first person = leader
  member_indexes TEXT[] NOT NULL,          -- all members incl. leader (max 5)
  is_claimed    BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by   UUID    NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (academic_year, group_number),
  CONSTRAINT max_five_members CHECK (array_length(member_indexes, 1) <= 5)
);

-- ── Student groups (created by group leader after roster is uploaded) ─────
CREATE TABLE student_groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id     UUID NOT NULL REFERENCES admin_group_roster(id),
  group_number  INT  NOT NULL,
  academic_year INT  NOT NULL,
  created_by    UUID NOT NULL REFERENCES users(id),  -- must be the roster leader
  project_id    UUID REFERENCES projects(id),
  supervisor_id UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (academic_year, group_number)
);

-- ── Group members ──────────────────────────────────────────────────────────
CREATE TABLE student_group_members (
  group_id  UUID    NOT NULL REFERENCES student_groups(id) ON DELETE CASCADE,
  user_id   UUID    NOT NULL REFERENCES users(id),
  is_leader BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- ── Add is_group_leader flag to users ─────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_group_leader BOOLEAN NOT NULL DEFAULT FALSE;

-- ── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX idx_roster_academic_year    ON admin_group_roster (academic_year);
CREATE INDEX idx_roster_is_claimed       ON admin_group_roster (is_claimed);
CREATE INDEX idx_roster_leader_index     ON admin_group_roster (leader_index);
CREATE INDEX idx_group_members_user      ON student_group_members (user_id);
CREATE INDEX idx_student_groups_year     ON student_groups (academic_year);

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE admin_group_roster    ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_group_members ENABLE ROW LEVEL SECURITY;

-- admin_group_roster: admins manage; students read their own entry
CREATE POLICY "roster_admin_all" ON admin_group_roster
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "roster_student_read_own" ON admin_group_roster
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role = 'student'
        AND index_number = ANY(member_indexes)
    )
  );

-- student_groups: members/leaders read; admin reads all
CREATE POLICY "groups_member_read" ON student_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_group_members
      WHERE group_id = student_groups.id AND user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','hod'))
  );

CREATE POLICY "groups_leader_insert" ON student_groups
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_group_leader = TRUE)
  );

-- student_group_members: members read own; admin reads all
CREATE POLICY "group_members_read" ON student_group_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM student_group_members m2
      WHERE m2.group_id = student_group_members.group_id AND m2.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','hod'))
  );
