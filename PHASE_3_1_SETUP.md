# Phase 3.1 — Supervisor archive upload

Narrow addition to Phase 3: supervisors can submit the final approved PDF
of their own students' projects to the institutional archive, mirroring
UMaT practice where the supervising lecturer hands the bound final report
to the department registry.

## Files

| File | Action |
|---|---|
| `supabase/migrations/011_supervisor_archive_upload.sql` | NEW — widens storage write to admin OR supervisor |
| `app/api/archive/supervisor-upload/route.ts` | NEW |
| `components/archive/supervisor-upload-form.tsx` | NEW |
| `app/(dashboard)/supervisor/projects/[id]/page.tsx` | **REPLACES** existing |

## Deployment

1. Extract zip into project root, overwriting the supervisor projects detail page
2. Run migration 011 in Supabase SQL Editor
3. Restart dev server (no new npm packages)

## End-to-end test

You'll need a project in status `final_passed`. The fastest way:

```sql
-- Set the soil-moisture project to final_passed for testing
UPDATE public.projects
SET status = 'final_passed'
WHERE title = 'AI-Driven Soil Moisture Monitoring for Smallholder Farms';
```

Then:
1. Sign in as the supervisor of that project (Kofi Sarpong in your test setup)
2. Navigate to Projects → click the project
3. You should see a primary-tinted **"Ready for archive"** card at the top
4. Click **Submit final PDF to archive**
5. Pick a PDF, click submit
6. Page refreshes, banner changes to green "In the institutional archive"
7. Project status is now `archived`
8. Sign in as any role → Archive page → search for "Soil Moisture" → you'll see it with the "PDF available" pill
9. Click into it → PDF viewer with watermark renders the document

## Edge cases verified

- ✓ Non-supervisor calling the endpoint → 403
- ✓ Supervisor trying to upload for a project they don't own → 403
- ✓ Supervisor trying to upload while status is `in_supervision` etc. → 409 with explicit status in error message
- ✓ Supervisor trying to upload twice (replace) → 409 "An archive already exists"
- ✓ Duplicate archive_code → 409
- ✓ Non-PDF file → 400
- ✓ File > 30MB → 400
