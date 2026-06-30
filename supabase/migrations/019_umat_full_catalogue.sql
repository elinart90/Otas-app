-- ============================================================================
-- Migration 019: Updated full UMaT faculty / department / programme catalogue
-- Adds a `faculty` column to departments for proper cascading selects.
-- Safe to run on existing DB — uses ON CONFLICT DO UPDATE to correct names.
-- ============================================================================

-- 1. Add `faculty` column if not already present
ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS faculty TEXT;

-- 2. Upsert all departments with correct faculty assignment
-- Strategy: ON CONFLICT (name) DO UPDATE so existing rows get corrected.

INSERT INTO departments (name, code, description, faculty) VALUES

  -- ── Faculty of Mining and Minerals Technology (FMMT) ──────────────────────
  ('Mining Engineering',
   'MINE', 'Faculty of Mining and Minerals Technology',
   'Faculty of Mining and Minerals Technology'),

  ('Minerals Engineering',
   'MIEN', 'Faculty of Mining and Minerals Technology',
   'Faculty of Mining and Minerals Technology'),

  -- ── Faculty of Engineering (FoE) ──────────────────────────────────────────
  ('Mechanical Engineering',
   'ME', 'Faculty of Engineering',
   'Faculty of Engineering'),

  ('Electrical and Electronic Engineering',
   'EEE', 'Faculty of Engineering',
   'Faculty of Engineering'),

  ('Renewable Energy Engineering',
   'REE', 'Faculty of Engineering',
   'Faculty of Engineering'),

  ('Robotic Engineering and Artificial Intelligence',
   'REAI', 'Faculty of Engineering',
   'Faculty of Engineering'),

  ('Civil Engineering',
   'CVE', 'Faculty of Engineering',
   'Faculty of Engineering'),

  -- ── Faculty of Computing and Mathematical Sciences (FCMS) ─────────────────
  ('Computer Science and Engineering',
   'CSE', 'Faculty of Computing and Mathematical Sciences',
   'Faculty of Computing and Mathematical Sciences'),

  ('Mathematical Sciences',
   'MATH', 'Faculty of Computing and Mathematical Sciences',
   'Faculty of Computing and Mathematical Sciences'),

  ('Cyber Security and Information Systems',
   'CSIS', 'Faculty of Computing and Mathematical Sciences',
   'Faculty of Computing and Mathematical Sciences'),

  -- ── Faculty of Geosciences and Environmental Studies (FGES) ───────────────
  ('Geological Engineering',
   'GEO', 'Faculty of Geosciences and Environmental Studies',
   'Faculty of Geosciences and Environmental Studies'),

  ('Geomatic Engineering',
   'GMAT', 'Faculty of Geosciences and Environmental Studies',
   'Faculty of Geosciences and Environmental Studies'),

  ('Environmental and Safety Engineering',
   'ESE', 'Faculty of Geosciences and Environmental Studies',
   'Faculty of Geosciences and Environmental Studies'),

  -- ── Faculty of Integrated Management Science (FIMS) ──────────────────────
  ('Management Studies',
   'MGT', 'Faculty of Integrated Management Science',
   'Faculty of Integrated Management Science'),

  ('Technical Communication',
   'TC', 'Faculty of Integrated Management Science',
   'Faculty of Integrated Management Science'),

  -- ── GNPC School of Petroleum Studies (SPS) ────────────────────────────────
  ('Petroleum and Natural Gas Engineering',
   'PNGE', 'GNPC School of Petroleum Studies',
   'GNPC School of Petroleum Studies'),

  ('Petroleum Geosciences and Engineering',
   'PGE', 'GNPC School of Petroleum Studies',
   'GNPC School of Petroleum Studies'),

  ('Chemical and Petrochemical Engineering',
   'CPE', 'GNPC School of Petroleum Studies',
   'GNPC School of Petroleum Studies')

ON CONFLICT (name) DO UPDATE SET
  code        = EXCLUDED.code,
  description = EXCLUDED.description,
  faculty     = EXCLUDED.faculty;

-- 3. Fix old stale department name (013 used "Environmental Science and Engineering")
-- Only rename if the old name still exists AND the new name doesn't already exist
UPDATE departments
SET name    = 'Environmental and Safety Engineering',
    code    = 'ESE',
    faculty = 'Faculty of Geosciences and Environmental Studies',
    description = 'Faculty of Geosciences and Environmental Studies'
WHERE name = 'Environmental Science and Engineering'
  AND NOT EXISTS (
    SELECT 1 FROM departments WHERE name = 'Environmental and Safety Engineering'
  );

-- 4. Upsert all programmes (linked by department name, no hardcoded UUIDs)
INSERT INTO programmes (department_id, name, code, level)
SELECT d.id, p.prog_name, p.prog_code, 'undergraduate'
FROM (VALUES

  -- Mining and Minerals Technology
  ('Mining Engineering',                          'BSc Mining Engineering',                             'MINE-BSC'),
  ('Minerals Engineering',                        'BSc Minerals Engineering',                           'MIEN-BSC'),

  -- Faculty of Engineering
  ('Mechanical Engineering',                      'BSc Mechanical Engineering',                         'ME-BSC'),
  ('Mechanical Engineering',                      'BSc Mechanical Engineering (Top-Up)',                'ME-BSC-TU'),
  ('Electrical and Electronic Engineering',       'BSc Electrical and Electronic Engineering',          'EEE-BSC'),
  ('Electrical and Electronic Engineering',       'BSc Electrical and Electronic Engineering (Top-Up)', 'EEE-BSC-TU'),
  ('Renewable Energy Engineering',                'BSc Renewable Energy Engineering',                   'REE-BSC'),
  ('Renewable Energy Engineering',                'BSc Solar Photovoltaic and Solar Thermal Systems',   'REE-SPSTS'),
  ('Robotic Engineering and Artificial Intelligence', 'BSc Robotic Engineering and Artificial Intelligence', 'REAI-BSC'),
  ('Civil Engineering',                           'BSc Civil Engineering',                              'CVE-BSC'),

  -- Faculty of Computing and Mathematical Sciences
  ('Computer Science and Engineering',            'BSc Computer Science and Engineering',               'CSE-BSC'),
  ('Mathematical Sciences',                       'BSc Mathematics',                                    'MATH-BSC'),
  ('Mathematical Sciences',                       'BSc Mathematics and Finance',                        'MATH-FIN'),
  ('Mathematical Sciences',                       'BSc Statistical Data Science',                       'MATH-SDS'),
  ('Mathematical Sciences',                       'BSc Data Science and Analytics',                     'MATH-DSA'),
  ('Cyber Security and Information Systems',      'BSc Cyber Security',                                 'CSIS-CS'),
  ('Cyber Security and Information Systems',      'BSc Information Systems and Technology',             'CSIS-IST'),

  -- Faculty of Geosciences and Environmental Studies
  ('Geological Engineering',                      'BSc Geological Engineering',                         'GEO-BSC'),
  ('Geomatic Engineering',                        'BSc Geomatic Engineering',                           'GMAT-BSC'),
  ('Geomatic Engineering',                        'BSc Land Administration and Information System',     'GMAT-LAIS'),
  ('Geomatic Engineering',                        'BSc Spatial Planning',                               'GMAT-SP'),
  ('Environmental and Safety Engineering',        'BSc Environmental and Safety Engineering',           'ESE-BSC'),

  -- Faculty of Integrated Management Science
  ('Management Studies',                          'BSc Economics and Industrial Organisation',          'MGT-EIO'),
  ('Management Studies',                          'BSc Logistics and Transport Management',             'MGT-LTM'),

  -- GNPC School of Petroleum Studies
  ('Petroleum and Natural Gas Engineering',       'BSc Petroleum Engineering',                          'PNGE-PE'),
  ('Petroleum and Natural Gas Engineering',       'BSc Natural Gas Engineering',                        'PNGE-NGE'),
  ('Petroleum Geosciences and Engineering',       'BSc Petroleum Geosciences and Engineering',          'PGE-BSC'),
  ('Chemical and Petrochemical Engineering',      'BSc Chemical Engineering',                           'CPE-CE'),
  ('Chemical and Petrochemical Engineering',      'BSc Petroleum Refining and Petrochemical Engineering', 'CPE-PRPE')

) AS p(dept_name, prog_name, prog_code)
JOIN departments d ON d.name = p.dept_name
ON CONFLICT (department_id, code) DO UPDATE SET
  name = EXCLUDED.name;

-- 5. Remove stale programmes that no longer exist
DELETE FROM programmes WHERE code IN (
  'MGT-BSC', 'MGT-ENG', 'PNGE-BSC'
);
