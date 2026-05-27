-- ============================================================================
-- OTAS - Online Thesis Archiving & Supervision System
-- Initial migration: tables, RLS policies, indexes, storage buckets
-- ============================================================================
-- Run this in Supabase SQL Editor (Project -> SQL Editor -> New Query -> paste -> Run)
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('student', 'supervisor', 'panel', 'hod', 'admin');
CREATE TYPE project_status AS ENUM (
  'draft',
  'proposal_submitted',
  'proposal_approved',
  'proposal_rejected',
  'in_supervision',
  'synopsis_scheduled',
  'synopsis_passed',
  'synopsis_failed',
  'final_scheduled',
  'final_passed',
  'final_failed',
  'archived'
);
CREATE TYPE defense_stage AS ENUM ('synopsis', 'final');
CREATE TYPE defense_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE plagiarism_status AS ENUM ('queued', 'processing', 'completed', 'failed');
CREATE TYPE supervision_outcome AS ENUM ('on_track', 'needs_attention', 'concern', 'excellent');

-- ============================================================================
-- DEPARTMENTS
-- ============================================================================

CREATE TABLE departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  code        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PROGRAMMES (e.g. BSc Computer Science under Computer Engineering dept)
-- ============================================================================

CREATE TABLE programmes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  name          TEXT NOT NULL,
  code          TEXT NOT NULL,
  level         TEXT NOT NULL DEFAULT 'undergraduate',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (department_id, code)
);

-- ============================================================================
-- USERS (mirrors auth.users; one row per registered account)
-- Role lives here AND in auth.users.user_metadata for middleware speed
-- ============================================================================

CREATE TABLE users (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role           user_role NOT NULL,
  full_name      TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  phone          TEXT,
  department_id  UUID REFERENCES departments(id) ON DELETE SET NULL,
  programme_id   UUID REFERENCES programmes(id) ON DELETE SET NULL,
  index_number   TEXT UNIQUE,
  staff_id       TEXT UNIQUE,
  avatar_url     TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PROJECTS - the spine of the system
-- ============================================================================

CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id    UUID NOT NULL REFERENCES programmes(id) ON DELETE RESTRICT,
  supervisor_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  abstract        TEXT,
  keywords        TEXT[],
  academic_year   INT NOT NULL,
  status          project_status NOT NULL DEFAULT 'draft',
  proposal_doc_url TEXT,
  final_doc_url   TEXT,
  created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PROJECT_MEMBERS - team composition (1 project, N students)
-- ============================================================================

CREATE TABLE project_members (
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_in_team  TEXT NOT NULL DEFAULT 'member',
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- ============================================================================
-- SUPERVISIONS - tracked sessions throughout the semester
-- ============================================================================

CREATE TABLE supervisions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  session_date  TIMESTAMPTZ NOT NULL,
  agenda        TEXT NOT NULL,
  notes         TEXT,
  outcome       supervision_outcome NOT NULL DEFAULT 'on_track',
  next_steps    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE supervision_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervision_id  UUID NOT NULL REFERENCES supervisions(id) ON DELETE CASCADE,
  file_url        TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type       TEXT,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- DEFENSE_SESSIONS + PANEL_ASSIGNMENTS
-- ============================================================================

CREATE TABLE defense_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage         defense_stage NOT NULL,
  scheduled_at  TIMESTAMPTZ NOT NULL,
  venue         TEXT,
  status        defense_status NOT NULL DEFAULT 'scheduled',
  scheduled_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  hod_decision  TEXT,
  decided_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE panel_assignments (
  defense_id  UUID NOT NULL REFERENCES defense_sessions(id) ON DELETE CASCADE,
  panelist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'panelist',
  PRIMARY KEY (defense_id, panelist_id)
);

-- ============================================================================
-- RUBRIC + DEFENSE SCORES
-- ============================================================================

CREATE TABLE rubric_criteria (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage       defense_stage NOT NULL,
  criterion   TEXT NOT NULL,
  description TEXT,
  max_score   INT NOT NULL DEFAULT 10,
  weight      DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  display_order INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE defense_scores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defense_id    UUID NOT NULL REFERENCES defense_sessions(id) ON DELETE CASCADE,
  panelist_id   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  criterion_id  UUID NOT NULL REFERENCES rubric_criteria(id) ON DELETE RESTRICT,
  score         INT NOT NULL,
  comment       TEXT,
  submitted     BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (defense_id, panelist_id, criterion_id)
);

-- ============================================================================
-- TITLE SIMILARITY CHECKS
-- ============================================================================

CREATE TABLE title_similarity_checks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  proposed_title  TEXT NOT NULL,
  matches         JSONB NOT NULL DEFAULT '[]',
  highest_score   DECIMAL(5,4),
  checked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PLAGIARISM REPORTS + MATCHES
-- ============================================================================

CREATE TABLE plagiarism_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_url        TEXT NOT NULL,
  document_name       TEXT NOT NULL,
  overall_similarity  DECIMAL(5,4),
  status              plagiarism_status NOT NULL DEFAULT 'queued',
  error_message       TEXT,
  processed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE plagiarism_matches (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id          UUID NOT NULL REFERENCES plagiarism_reports(id) ON DELETE CASCADE,
  matched_archive_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  similarity_score   DECIMAL(5,4) NOT NULL,
  matched_passages   JSONB NOT NULL DEFAULT '[]',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ARCHIVES - the permanent digital archive
-- ============================================================================

CREATE TABLE archives (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT UNIQUE,
  archive_code  TEXT NOT NULL UNIQUE,
  document_url  TEXT NOT NULL,
  year          INT NOT NULL,
  uploaded_by   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shingles      JSONB,
  fts           TSVECTOR
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_dept ON users(department_id);
CREATE INDEX idx_users_programme ON users(programme_id);

CREATE INDEX idx_projects_programme_year ON projects(programme_id, academic_year);
CREATE INDEX idx_projects_supervisor ON projects(supervisor_id);
CREATE INDEX idx_projects_status ON projects(status);

CREATE INDEX idx_supervisions_project_date ON supervisions(project_id, session_date DESC);
CREATE INDEX idx_supervisions_supervisor ON supervisions(supervisor_id);

CREATE INDEX idx_defense_project_stage ON defense_sessions(project_id, stage);
CREATE INDEX idx_defense_status ON defense_sessions(status);
CREATE INDEX idx_panel_panelist ON panel_assignments(panelist_id);

CREATE INDEX idx_scores_defense_panelist ON defense_scores(defense_id, panelist_id);

CREATE INDEX idx_plag_user ON plagiarism_reports(user_id);
CREATE INDEX idx_plag_status ON plagiarism_reports(status);
CREATE INDEX idx_plag_matches_report ON plagiarism_matches(report_id, similarity_score DESC);

CREATE INDEX idx_archives_year_prog ON archives(year DESC);
CREATE INDEX idx_archives_fts ON archives USING GIN(fts);

-- Full-text search trigger for archives
CREATE OR REPLACE FUNCTION update_archive_fts()
RETURNS TRIGGER AS $$
DECLARE
  proj RECORD;
BEGIN
  SELECT title, abstract INTO proj FROM projects WHERE id = NEW.project_id;
  NEW.fts := to_tsvector('english', COALESCE(proj.title, '') || ' ' || COALESCE(proj.abstract, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER archive_fts_update
BEFORE INSERT OR UPDATE ON archives
FOR EACH ROW EXECUTE FUNCTION update_archive_fts();

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER projects_set_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER supervisions_set_updated_at BEFORE UPDATE ON supervisions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER scores_set_updated_at BEFORE UPDATE ON defense_scores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS for RLS
-- ============================================================================

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION is_project_member(proj UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM project_members
    WHERE project_id = proj AND user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION is_project_supervisor(proj UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM projects WHERE id = proj AND supervisor_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION is_assigned_panelist(def UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM panel_assignments
    WHERE defense_id = def AND panelist_id = auth.uid()
  )
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervision_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE defense_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE defense_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE title_similarity_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE plagiarism_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE plagiarism_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE archives ENABLE ROW LEVEL SECURITY;

-- DEPARTMENTS / PROGRAMMES - readable by all authenticated, writable by admin
CREATE POLICY dept_read ON departments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY dept_write ON departments FOR ALL TO authenticated
  USING (current_user_role() = 'admin') WITH CHECK (current_user_role() = 'admin');

CREATE POLICY prog_read ON programmes FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY prog_write ON programmes FOR ALL TO authenticated
  USING (current_user_role() = 'admin') WITH CHECK (current_user_role() = 'admin');

-- USERS - read own + role-based, admin manages all
CREATE POLICY users_read_own ON users FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY users_read_staff ON users FOR SELECT TO authenticated
  USING (current_user_role() IN ('supervisor','panel','hod','admin'));
CREATE POLICY users_update_own ON users FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY users_admin_all ON users FOR ALL TO authenticated
  USING (current_user_role() = 'admin') WITH CHECK (current_user_role() = 'admin');

-- PROJECTS
CREATE POLICY proj_read_member ON projects FOR SELECT TO authenticated
  USING (is_project_member(id));
CREATE POLICY proj_read_supervisor ON projects FOR SELECT TO authenticated
  USING (supervisor_id = auth.uid());
CREATE POLICY proj_read_staff ON projects FOR SELECT TO authenticated
  USING (current_user_role() IN ('panel','hod','admin'));
CREATE POLICY proj_insert_student ON projects FOR INSERT TO authenticated
  WITH CHECK (current_user_role() = 'student' AND created_by = auth.uid());
CREATE POLICY proj_update_member ON projects FOR UPDATE TO authenticated
  USING (is_project_member(id) AND status = 'draft');
CREATE POLICY proj_update_supervisor ON projects FOR UPDATE TO authenticated
  USING (supervisor_id = auth.uid());
CREATE POLICY proj_update_hod ON projects FOR UPDATE TO authenticated
  USING (current_user_role() IN ('hod','admin'));

-- PROJECT_MEMBERS
CREATE POLICY pm_read ON project_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_project_supervisor(project_id)
    OR current_user_role() IN ('panel','hod','admin')
  );
CREATE POLICY pm_insert ON project_members FOR INSERT TO authenticated
  WITH CHECK (current_user_role() = 'student' OR current_user_role() IN ('hod','admin'));
CREATE POLICY pm_delete ON project_members FOR DELETE TO authenticated
  USING (current_user_role() IN ('hod','admin'));

-- SUPERVISIONS
CREATE POLICY sup_read_member ON supervisions FOR SELECT TO authenticated
  USING (is_project_member(project_id));
CREATE POLICY sup_read_panel_hod ON supervisions FOR SELECT TO authenticated
  USING (current_user_role() IN ('panel','hod','admin') OR supervisor_id = auth.uid());
CREATE POLICY sup_insert_supervisor ON supervisions FOR INSERT TO authenticated
  WITH CHECK (supervisor_id = auth.uid() AND current_user_role() = 'supervisor');
CREATE POLICY sup_update_supervisor ON supervisions FOR UPDATE TO authenticated
  USING (supervisor_id = auth.uid());

-- SUPERVISION_ATTACHMENTS
CREATE POLICY supatt_read ON supervision_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM supervisions s
            WHERE s.id = supervision_id
            AND (s.supervisor_id = auth.uid()
                 OR is_project_member(s.project_id)
                 OR current_user_role() IN ('panel','hod','admin')))
  );
CREATE POLICY supatt_write ON supervision_attachments FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM supervisions s WHERE s.id = supervision_id AND s.supervisor_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM supervisions s WHERE s.id = supervision_id AND s.supervisor_id = auth.uid())
  );

-- DEFENSE_SESSIONS
CREATE POLICY def_read_member ON defense_sessions FOR SELECT TO authenticated
  USING (is_project_member(project_id) OR is_assigned_panelist(id));
CREATE POLICY def_read_staff ON defense_sessions FOR SELECT TO authenticated
  USING (current_user_role() IN ('supervisor','hod','admin'));
CREATE POLICY def_write_hod ON defense_sessions FOR ALL TO authenticated
  USING (current_user_role() IN ('hod','admin'))
  WITH CHECK (current_user_role() IN ('hod','admin'));

-- PANEL_ASSIGNMENTS
CREATE POLICY pa_read ON panel_assignments FOR SELECT TO authenticated
  USING (panelist_id = auth.uid() OR current_user_role() IN ('hod','admin'));
CREATE POLICY pa_write_hod ON panel_assignments FOR ALL TO authenticated
  USING (current_user_role() IN ('hod','admin'))
  WITH CHECK (current_user_role() IN ('hod','admin'));

-- RUBRIC_CRITERIA - readable by all, writable by admin/hod
CREATE POLICY rc_read ON rubric_criteria FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY rc_write ON rubric_criteria FOR ALL TO authenticated
  USING (current_user_role() IN ('hod','admin'))
  WITH CHECK (current_user_role() IN ('hod','admin'));

-- DEFENSE_SCORES
CREATE POLICY ds_read_panelist ON defense_scores FOR SELECT TO authenticated
  USING (panelist_id = auth.uid());
CREATE POLICY ds_read_hod ON defense_scores FOR SELECT TO authenticated
  USING (current_user_role() IN ('hod','admin'));
CREATE POLICY ds_read_member_after_decision ON defense_scores FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM defense_sessions d
      WHERE d.id = defense_id
      AND d.status = 'completed'
      AND d.hod_decision IS NOT NULL
      AND is_project_member(d.project_id)
    )
  );
CREATE POLICY ds_insert_panelist ON defense_scores FOR INSERT TO authenticated
  WITH CHECK (panelist_id = auth.uid() AND is_assigned_panelist(defense_id));
CREATE POLICY ds_update_panelist ON defense_scores FOR UPDATE TO authenticated
  USING (panelist_id = auth.uid() AND submitted = FALSE);

-- TITLE_SIMILARITY_CHECKS
CREATE POLICY tsc_read_own ON title_similarity_checks FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR current_user_role() IN ('supervisor','hod','admin'));
CREATE POLICY tsc_insert_own ON title_similarity_checks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- PLAGIARISM_REPORTS
CREATE POLICY pr_read_own ON plagiarism_reports FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR current_user_role() IN ('supervisor','hod','admin'));
CREATE POLICY pr_insert_own ON plagiarism_reports FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- PLAGIARISM_MATCHES - read via parent report's permissions
CREATE POLICY pm_match_read ON plagiarism_matches FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM plagiarism_reports r
      WHERE r.id = report_id
      AND (r.user_id = auth.uid() OR current_user_role() IN ('supervisor','hod','admin'))
    )
  );

-- ARCHIVES
CREATE POLICY arc_read ON archives FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY arc_write_admin ON archives FOR ALL TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- ============================================================================
-- AUTO-SYNC: when a row is added to auth.users via signup,
-- the application code is responsible for inserting into public.users.
-- We do NOT auto-create here because role/department/programme must be
-- chosen at registration time.
-- ============================================================================

-- ============================================================================
-- SEED: default rubric criteria (UMaT-style, adjust to your real rubric)
-- ============================================================================

INSERT INTO rubric_criteria (stage, criterion, description, max_score, weight, display_order) VALUES
  ('synopsis', 'Problem statement', 'Clarity, motivation, and significance of the problem', 10, 1.0, 1),
  ('synopsis', 'Literature review', 'Coverage and analysis of relevant prior work', 10, 1.0, 2),
  ('synopsis', 'Methodology', 'Soundness and feasibility of proposed approach', 10, 1.5, 3),
  ('synopsis', 'Presentation', 'Slide quality, articulation, time management', 10, 1.0, 4),
  ('synopsis', 'Q & A', 'Depth of understanding shown during questioning', 10, 1.5, 5),
  ('final', 'Implementation', 'Quality and completeness of the implemented system', 10, 2.0, 1),
  ('final', 'Testing & validation', 'Evidence the system works as intended', 10, 1.5, 2),
  ('final', 'Documentation', 'Quality of the final report', 10, 1.0, 3),
  ('final', 'Demonstration', 'Live demo clarity and effectiveness', 10, 1.5, 4),
  ('final', 'Q & A', 'Depth of understanding of work and field', 10, 2.0, 5);

-- ============================================================================
-- DONE
-- Next: create storage buckets in Supabase Dashboard:
--   1. project-documents (PRIVATE)
--   2. plagiarism-uploads (PRIVATE)
--   3. supervision-attachments (PRIVATE)
--   4. avatars (PUBLIC)
-- See README for bucket policies.
-- ============================================================================
