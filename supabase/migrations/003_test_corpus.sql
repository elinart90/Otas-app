BEGIN;

SET LOCAL row_security = off;

DO $$
DECLARE
  admin_user_id UUID;
  dept_id UUID;
  prog_id UUID;
  proj_id UUID;
  inserted_count INT := 0;
  arc_titles TEXT[][] := ARRAY[
    ['Online Library Management System', '2021'],
    ['A Web-Based Student Records Management System', '2020'],
    ['Hospital Patient Tracking and Appointment Scheduling System', '2022'],
    ['E-Voting System for University Student Elections', '2021'],
    ['Mobile Application for Tracking Personal Finance', '2023'],
    ['Real-Time Bus Tracking System Using GPS', '2022'],
    ['Web-Based Inventory Management System for Small Businesses', '2020'],
    ['Smart Attendance System Using Facial Recognition', '2023'],
    ['Online Examination System with Anti-Cheating Mechanisms', '2019'],
    ['IoT-Based Smart Home Automation System', '2022'],
    ['Machine Learning Approach to Crop Disease Detection', '2023'],
    ['Blockchain-Based Academic Certificate Verification System', '2024'],
    ['E-Commerce Platform for Local Artisans', '2021'],
    ['AI Chatbot for University Admissions Inquiries', '2024'],
    ['Solar Power Monitoring and Logging System', '2022']
  ];
  i INT;
BEGIN
  SELECT id INTO admin_user_id FROM public.users WHERE role = 'admin' LIMIT 1;
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'No admin user exists. Register an admin via /register first.';
  END IF;

  SELECT id INTO dept_id FROM public.departments LIMIT 1;
  IF dept_id IS NULL THEN
    INSERT INTO public.departments (name, code, description)
    VALUES ('Computer Science and Engineering', 'CSE',
            'Department of Computer Science and Engineering')
    RETURNING id INTO dept_id;
  END IF;

  SELECT id INTO prog_id FROM public.programmes WHERE department_id = dept_id LIMIT 1;
  IF prog_id IS NULL THEN
    INSERT INTO public.programmes (department_id, name, code, level)
    VALUES (dept_id, 'BSc Computer Science and Engineering', 'CSE-BSC',
            'undergraduate')
    RETURNING id INTO prog_id;
  END IF;

  FOR i IN 1..array_length(arc_titles, 1) LOOP
    IF EXISTS (SELECT 1 FROM public.projects WHERE title = arc_titles[i][1]) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.projects (
      programme_id, title, abstract, academic_year, status, created_by
    ) VALUES (
      prog_id, arc_titles[i][1],
      'Sample archived project for similarity-check test corpus.',
      arc_titles[i][2]::INT, 'archived', admin_user_id
    ) RETURNING id INTO proj_id;

    INSERT INTO public.archives (
      project_id, archive_code, document_url, year, uploaded_by
    ) VALUES (
      proj_id,
      'ARC-' || arc_titles[i][2] || '-' || lpad(i::text, 3, '0'),
      'placeholder://document-not-uploaded-' || i,
      arc_titles[i][2]::INT, admin_user_id
    );

    inserted_count := inserted_count + 1;
  END LOOP;

  RAISE NOTICE 'Test corpus seed complete. Inserted % new projects (admin: %).',
               inserted_count, admin_user_id;
END $$;

COMMIT;