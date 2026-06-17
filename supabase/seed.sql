-- ============================================================================
-- OTAS Seed Data
-- ============================================================================
-- IMPORTANT: Run this AFTER creating test users in Supabase Auth.
-- Steps:
--   1. Go to Authentication -> Users -> Add User (Manual)
--   2. Create one user per role (use any test emails like:
--        admin@otas.test     / Test1234!
--        hod@otas.test       / Test1234!
--        supervisor@otas.test / Test1234!
--        panel@otas.test     / Test1234!
--        student@otas.test   / Test1234!)
--   3. Copy each user's UUID from auth.users
--   4. Replace the placeholder UUIDs below before running this seed
-- ============================================================================

-- ============================================================================
-- DEPARTMENTS — University of Mines and Technology, Tarkwa (UMaT)
-- ============================================================================

INSERT INTO departments (id, name, code, description) VALUES

  -- Faculty of Computing and Mathematical Sciences (FCMS)
  ('11111111-1111-1111-1111-111111111111',
   'Computer Science and Engineering',
   'CSE',
   'Faculty of Computing and Mathematical Sciences'),

  ('22222222-2222-2222-2222-222222222222',
   'Mathematical Sciences',
   'MATH',
   'Faculty of Computing and Mathematical Sciences'),

  -- Faculty of Engineering (FoE)
  ('33333333-3333-3333-3333-333333333333',
   'Electrical and Electronic Engineering',
   'EEE',
   'Faculty of Engineering'),

  ('44444444-4444-4444-4444-444444444444',
   'Renewable Energy Engineering',
   'REE',
   'Faculty of Engineering'),

  ('55555555-5555-5555-5555-555555555555',
   'Mechanical Engineering',
   'ME',
   'Faculty of Engineering'),

  -- Faculty of Mining and Minerals Technology (FMMT)
  ('66666666-6666-6666-6666-666666666666',
   'Mining Engineering',
   'MINE',
   'Faculty of Mining and Minerals Technology'),

  ('77777777-7777-7777-7777-777777777777',
   'Minerals Engineering',
   'MIEN',
   'Faculty of Mining and Minerals Technology'),

  -- Faculty of Geosciences and Environmental Studies (FGES)
  ('88888888-8888-8888-8888-888888888888',
   'Geological Engineering',
   'GEO',
   'Faculty of Geosciences and Environmental Studies'),

  ('99999999-9999-9999-9999-999999999999',
   'Geomatic Engineering',
   'GMAT',
   'Faculty of Geosciences and Environmental Studies'),

  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Environmental Science and Engineering',
   'ENV',
   'Faculty of Geosciences and Environmental Studies'),

  -- Faculty of Integrated Management Science (FIMS)
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'Management Studies',
   'MGT',
   'Faculty of Integrated Management Science'),

  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   'Technical Communication',
   'TC',
   'Faculty of Integrated Management Science'),

  -- School of Petroleum Studies (SPS)
  ('dddddddd-dddd-dddd-dddd-dddddddddddd',
   'Petroleum and Natural Gas Engineering',
   'PNGE',
   'School of Petroleum Studies'),

  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   'Petroleum Geosciences and Engineering',
   'PGE',
   'School of Petroleum Studies'),

  ('ffffffff-ffff-ffff-ffff-ffffffffffff',
   'Chemical and Petrochemical Engineering',
   'CPE',
   'School of Petroleum Studies')

ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- PROGRAMMES
-- ============================================================================

INSERT INTO programmes (id, department_id, name, code, level) VALUES

  -- Computer Science and Engineering
  ('p1111111-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111',
   'BSc Computer Science and Engineering', 'CSE-BSC', 'undergraduate'),

  -- Mathematical Sciences
  ('p2222222-2222-2222-2222-222222222222',
   '22222222-2222-2222-2222-222222222222',
   'BSc Mathematics', 'MATH-BSC', 'undergraduate'),

  -- Electrical and Electronic Engineering
  ('p3333333-3333-3333-3333-333333333333',
   '33333333-3333-3333-3333-333333333333',
   'BSc Electrical and Electronic Engineering', 'EEE-BSC', 'undergraduate'),

  -- Renewable Energy Engineering
  ('p4444444-4444-4444-4444-444444444444',
   '44444444-4444-4444-4444-444444444444',
   'BSc Renewable Energy Engineering', 'REE-BSC', 'undergraduate'),

  -- Mechanical Engineering
  ('p5555555-5555-5555-5555-555555555555',
   '55555555-5555-5555-5555-555555555555',
   'BSc Mechanical Engineering', 'ME-BSC', 'undergraduate'),

  -- Mining Engineering
  ('p6666666-6666-6666-6666-666666666666',
   '66666666-6666-6666-6666-666666666666',
   'BSc Mining Engineering', 'MINE-BSC', 'undergraduate'),

  -- Minerals Engineering
  ('p7777777-7777-7777-7777-777777777777',
   '77777777-7777-7777-7777-777777777777',
   'BSc Minerals Engineering', 'MIEN-BSC', 'undergraduate'),

  -- Geological Engineering
  ('p8888888-8888-8888-8888-888888888888',
   '88888888-8888-8888-8888-888888888888',
   'BSc Geological Engineering', 'GEO-BSC', 'undergraduate'),

  -- Geomatic Engineering
  ('p9999999-9999-9999-9999-999999999999',
   '99999999-9999-9999-9999-999999999999',
   'BSc Geomatic Engineering', 'GMAT-BSC', 'undergraduate'),

  -- Environmental Science and Engineering
  ('paaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'BSc Environmental and Safety Engineering', 'ENV-BSC', 'undergraduate'),

  -- Management Studies (3 programmes)
  ('pbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'BSc Management Studies', 'MGT-BSC', 'undergraduate'),

  ('pb111111-1111-1111-1111-111111111111',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'BSc Logistics and Transport Management', 'MGT-LTM', 'undergraduate'),

  ('pb222222-2222-2222-2222-222222222222',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'BSc Engineering Management', 'MGT-ENG', 'undergraduate'),

  -- Petroleum and Natural Gas Engineering
  ('pdddddd1-dddd-dddd-dddd-dddddddddddd',
   'dddddddd-dddd-dddd-dddd-dddddddddddd',
   'BSc Petroleum and Natural Gas Engineering', 'PNGE-BSC', 'undergraduate'),

  -- Petroleum Geosciences and Engineering
  ('peeeeee1-eeee-eeee-eeee-eeeeeeeeeeee',
   'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   'BSc Petroleum Geosciences and Engineering', 'PGE-BSC', 'undergraduate'),

  -- Chemical and Petrochemical Engineering
  ('pffffff1-ffff-ffff-ffff-ffffffffffff',
   'ffffffff-ffff-ffff-ffff-ffffffffffff',
   'BSc Chemical Engineering', 'CPE-BSC', 'undergraduate')

ON CONFLICT (department_id, code) DO NOTHING;

-- ============================================================================
-- USERS (replace UUIDs with your auth.users IDs)
-- ============================================================================
-- After creating each user in Supabase Auth, run something like:
--
-- INSERT INTO public.users (id, role, full_name, email, department_id, programme_id, staff_id)
-- VALUES (
--   '<paste-uuid-from-auth.users>',
--   'admin',
--   'Test Admin',
--   'admin@otas.test',
--   '11111111-1111-1111-1111-111111111111',
--   NULL,
--   'STF-001'
-- );
--
-- Repeat for each role with their respective UUID.
-- ============================================================================
