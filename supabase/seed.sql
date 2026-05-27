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

-- DEPARTMENTS
INSERT INTO departments (id, name, code, description) VALUES
  ('11111111-1111-1111-1111-111111111111',
   'Computer Science and Engineering',
   'CSE',
   'Department of Computer Science and Engineering'),
  ('22222222-2222-2222-2222-222222222222',
   'Electrical and Electronic Engineering',
   'EEE',
   'Department of Electrical and Electronic Engineering');

-- PROGRAMMES
INSERT INTO programmes (id, department_id, name, code, level) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111',
   'BSc Computer Science and Engineering',
   'CSE-BSC',
   'undergraduate'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '22222222-2222-2222-2222-222222222222',
   'BSc Electrical and Electronic Engineering',
   'EEE-BSC',
   'undergraduate');

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
