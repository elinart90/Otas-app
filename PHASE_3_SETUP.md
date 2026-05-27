# Phase 3 — Archive module setup

## Required packages (install before testing)

```powershell
npm install react-pdf@9.1.1 pdfjs-dist@4.7.76
```

These power the no-download PDF viewer. `react-pdf` renders PDF pages to a
canvas via `pdfjs-dist`'s engine; the viewer never exposes the file bytes
to the browser's native PDF UI.

## Required migration

Run `supabase/migrations/010_archive_phase.sql` in the Supabase SQL Editor.

This adds:
- Storage policies: any authenticated user can READ from `archives` bucket;
  only admins can WRITE/DELETE.
- The `pg_trgm` extension and a trigram index for fast title search.
- An `archive_views` audit table that logs every PDF view.

## Required Supabase setup

Confirm the `archives` storage bucket exists and is **private**. It should
have been created in Phase 1B. If not:
1. Supabase Dashboard → Storage → New bucket
2. Name: `archives`
3. Public: OFF
4. Save

## Test corpus

The 15 seeded test archives have placeholder document URLs (no real PDF).
This is intentional. The browser will show them as "Metadata only" cards,
which proves the search and listing work without depending on real files.

To test the full viewer:
1. Sign in as admin
2. Navigate to Admin → Archives
3. You won't see the placeholder seed entries here (they're not `final_passed`).
4. Either:
   - Run through the full Phase 2 workflow on a fresh project to reach `final_passed`,
     then upload its PDF via this page, OR
   - Update one of the seed projects to status `final_passed` manually:
     ```sql
     UPDATE public.projects
     SET status = 'final_passed'
     WHERE title = 'Online Library Management System';
     ```
     Then upload via the admin page.

## Defensible viewer claims (for viva)

The viewer enforces:
- Canvas rendering via PDF.js (bypasses browser native PDF UI with its download button)
- Disabled right-click context menu
- Disabled text selection via CSS `user-select: none`
- Diagonal watermark with viewer name + date on every page
- Signed URLs that expire after 10 minutes
- Audit logging of every view in `archive_views` table

What it does NOT prevent (be honest):
- Screenshots
- Screen recording
- Devtools-savvy users extracting bytes

The system is **institutional access control with full audit**, not DRM.
This framing protects you at viva — no one who claims to prevent
browser-side downloads is being honest.
