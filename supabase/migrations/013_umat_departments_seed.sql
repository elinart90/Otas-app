-- ============================================================================
-- Migration 013: Full UMaT department and programme catalogue
-- ============================================================================
-- Safe to run against an existing database — uses ON CONFLICT DO NOTHING so
-- departments/programmes that are already present are left untouched.
--
-- Run in: Supabase Dashboard → SQL Editor → New Query → paste → Run
-- ============================================================================

-- ============================================================================
-- DEPARTMENTS
-- ============================================================================

INSERT INTO departments (name, code, description) VALUES

  -- Faculty of Computing and Mathematical Sciences (FCMS)
  ('Computer Science and Engineering',
   'CSE',
   'Faculty of Computing and Mathematical Sciences'),

  ('Mathematical Sciences',
   'MATH',
   'Faculty of Computing and Mathematical Sciences'),

  -- Faculty of Engineering (FoE)
  ('Electrical and Electronic Engineering',
   'EEE',
   'Faculty of Engineering'),

  ('Renewable Energy Engineering',
   'REE',
   'Faculty of Engineering'),

  ('Mechanical Engineering',
   'ME',
   'Faculty of Engineering'),

  -- Faculty of Mining and Minerals Technology (FMMT)
  ('Mining Engineering',
   'MINE',
   'Faculty of Mining and Minerals Technology'),

  ('Minerals Engineering',
   'MIEN',
   'Faculty of Mining and Minerals Technology'),

  -- Faculty of Geosciences and Environmental Studies (FGES)
  ('Geological Engineering',
   'GEO',
   'Faculty of Geosciences and Environmental Studies'),

  ('Geomatic Engineering',
   'GMAT',
   'Faculty of Geosciences and Environmental Studies'),

  ('Environmental Science and Engineering',
   'ENV',
   'Faculty of Geosciences and Environmental Studies'),

  -- Faculty of Integrated Management Science (FIMS)
  ('Management Studies',
   'MGT',
   'Faculty of Integrated Management Science'),

  ('Technical Communication',
   'TC',
   'Faculty of Integrated Management Science'),

  -- School of Petroleum Studies (SPS)
  ('Petroleum and Natural Gas Engineering',
   'PNGE',
   'School of Petroleum Studies'),

  ('Petroleum Geosciences and Engineering',
   'PGE',
   'School of Petroleum Studies'),

  ('Chemical and Petrochemical Engineering',
   'CPE',
   'School of Petroleum Studies')

ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- PROGRAMMES
-- Inserted by joining on department name so no hardcoded UUIDs are needed.
-- Each INSERT selects the department_id dynamically — safe even if UUIDs
-- differ between environments.
-- ============================================================================

INSERT INTO programmes (department_id, name, code, level)
SELECT d.id, p.prog_name, p.prog_code, 'undergraduate'
FROM (VALUES
  -- Computer Science and Engineering
  ('Computer Science and Engineering', 'BSc Computer Science and Engineering', 'CSE-BSC'),

  -- Mathematical Sciences
  ('Mathematical Sciences', 'BSc Mathematics', 'MATH-BSC'),

  -- Electrical and Electronic Engineering
  ('Electrical and Electronic Engineering', 'BSc Electrical and Electronic Engineering', 'EEE-BSC'),

  -- Renewable Energy Engineering
  ('Renewable Energy Engineering', 'BSc Renewable Energy Engineering', 'REE-BSC'),

  -- Mechanical Engineering
  ('Mechanical Engineering', 'BSc Mechanical Engineering', 'ME-BSC'),

  -- Mining Engineering
  ('Mining Engineering', 'BSc Mining Engineering', 'MINE-BSC'),

  -- Minerals Engineering
  ('Minerals Engineering', 'BSc Minerals Engineering', 'MIEN-BSC'),

  -- Geological Engineering
  ('Geological Engineering', 'BSc Geological Engineering', 'GEO-BSC'),

  -- Geomatic Engineering
  ('Geomatic Engineering', 'BSc Geomatic Engineering', 'GMAT-BSC'),

  -- Environmental Science and Engineering
  ('Environmental Science and Engineering', 'BSc Environmental and Safety Engineering', 'ENV-BSC'),

  -- Management Studies (3 programmes)
  ('Management Studies', 'BSc Management Studies', 'MGT-BSC'),
  ('Management Studies', 'BSc Logistics and Transport Management', 'MGT-LTM'),
  ('Management Studies', 'BSc Engineering Management', 'MGT-ENG'),

  -- Petroleum and Natural Gas Engineering
  ('Petroleum and Natural Gas Engineering', 'BSc Petroleum and Natural Gas Engineering', 'PNGE-BSC'),

  -- Petroleum Geosciences and Engineering
  ('Petroleum Geosciences and Engineering', 'BSc Petroleum Geosciences and Engineering', 'PGE-BSC'),

  -- Chemical and Petrochemical Engineering
  ('Chemical and Petrochemical Engineering', 'BSc Chemical Engineering', 'CPE-BSC')

) AS p(dept_name, prog_name, prog_code)
JOIN departments d ON d.name = p.dept_name
ON CONFLICT (department_id, code) DO NOTHING;
