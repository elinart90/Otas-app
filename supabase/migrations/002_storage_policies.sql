-- ============================================================================
-- OTAS - Storage policies for buckets
-- ============================================================================
-- PREREQUISITE: 001_initial_schema.sql must be run first (it defines
-- the public.current_user_role() helper used below).
--
-- PREREQUISITE: Create these 4 buckets in Supabase Dashboard -> Storage first:
--   1. project-documents      (PRIVATE)
--   2. plagiarism-uploads     (PRIVATE)
--   3. supervision-attachments (PRIVATE)
--   4. avatars                (PUBLIC)
--
-- Then run this file in SQL Editor.
-- ============================================================================

-- ---------------- project-documents bucket ----------------

CREATE POLICY "project_docs_read_authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'project-documents');

CREATE POLICY "project_docs_write_admin"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-documents'
  AND public.current_user_role() = 'admin'
);

CREATE POLICY "project_docs_update_admin"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'project-documents'
  AND public.current_user_role() = 'admin'
);

CREATE POLICY "project_docs_delete_admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'project-documents'
  AND public.current_user_role() = 'admin'
);

-- ---------------- plagiarism-uploads bucket ----------------
-- Path convention: <user_id>/<filename>.pdf

CREATE POLICY "plag_upload_own_folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'plagiarism-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "plag_read_own_or_staff"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'plagiarism-uploads'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.current_user_role() IN ('supervisor', 'hod', 'admin')
  )
);

CREATE POLICY "plag_delete_own_or_admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'plagiarism-uploads'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.current_user_role() = 'admin'
  )
);

-- ---------------- supervision-attachments bucket ----------------
-- Path convention: <supervisor_id>/<supervision_id>/<filename>

CREATE POLICY "sup_att_upload_supervisor"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'supervision-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.current_user_role() = 'supervisor'
);

CREATE POLICY "sup_att_read_authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'supervision-attachments');

CREATE POLICY "sup_att_delete_supervisor"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'supervision-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ---------------- avatars bucket ----------------
-- Public read is automatic (bucket is public).
-- Path convention: <user_id>/avatar.png

CREATE POLICY "avatars_upload_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatars_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatars_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
