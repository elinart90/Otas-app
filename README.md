# OTAS — Online Thesis Archive & Supervision System

Web-based undergraduate project supervision, assessment, and archive management
system. Final-year project, University of Mines and Technology (UMaT).

This repository contains the **Phase 0 foundation** — auth, RBAC, database
schema, role-based dashboards. Features (supervision, defense, similarity,
plagiarism, archive) are built on top of this foundation in subsequent phases.

---

## Tech stack

- **Next.js 14** (App Router, Server Components, Server Actions)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** — Postgres, Auth, Storage, Edge Functions
- **Zod** — input validation
- **Vercel** — deployment

Three-tier architecture:

1. **Presentation** — React Server/Client Components, Tailwind UI
2. **Application** — Next.js API routes, Server Actions, `middleware.ts` (RBAC)
3. **Data** — Supabase Postgres with Row-Level Security (RLS)

---

## Setup

### 1. Prerequisites

- Node.js 18.17+ and npm
- Supabase account (free tier is fine)
- Git

### 2. Clone & install

```bash
git clone <your-repo-url> otas
cd otas
npm install
```

### 3. Supabase project

1. Go to [supabase.com](https://supabase.com) → **New Project**.
2. Name it `otas`, set a strong DB password (save it somewhere safe).
3. Wait ~2 minutes for provisioning.
4. **Project Settings → API**: copy the **Project URL**, **anon public key**,
   and **service_role key**.

### 4. Environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and paste your three Supabase keys.

> The `service_role` key bypasses RLS. **Never** commit it. **Never** import
> `lib/supabase/admin.ts` from client components.

### 5. Run the database migration

In Supabase Dashboard:

1. **SQL Editor → New Query**
2. Open `supabase/migrations/001_initial_schema.sql` from this repo
3. Paste the contents into the SQL Editor and click **Run**

This creates 17 tables, RLS policies, indexes, helper functions, and seeds the
default rubric criteria.

### 6. Create storage buckets

In Supabase Dashboard → **Storage**, create four buckets:

| Bucket name              | Public? | Purpose                                  |
|--------------------------|---------|------------------------------------------|
| `project-documents`      | No      | Approved softcopies for the archive     |
| `plagiarism-uploads`     | No      | Student-uploaded summary PDFs           |
| `supervision-attachments`| No      | Files attached to supervision sessions  |
| `avatars`                | Yes     | User profile images                     |

For each private bucket, add this RLS policy under **Storage → Policies**:

```sql
-- Allow authenticated users to upload to their own folder (folder = user id)
CREATE POLICY "users can upload to own folder" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow read of own files
CREATE POLICY "users can read own files" ON storage.objects
FOR SELECT TO authenticated USING (
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### 7. Disable email confirmation for development (optional)

For faster testing, **Authentication → Providers → Email** → toggle off
"Confirm email". You can re-enable for production.

### 8. Create your test users

Either via the registration page (`/register`) or manually via
**Authentication → Users → Add user**. The seed file
(`supabase/seed.sql`) has guidance for inserting profile rows.

A typical first run:

| Email                | Password   | Role       |
|----------------------|------------|------------|
| admin@otas.test      | Test1234!  | admin      |
| hod@otas.test        | Test1234!  | hod        |
| supervisor@otas.test | Test1234!  | supervisor |
| panel@otas.test      | Test1234!  | panel      |
| student@otas.test    | Test1234!  | student    |

### 9. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 10. Verify RBAC works

- Sign in as each test user.
- You should land on a different dashboard for each role (`/student`,
  `/supervisor`, etc.).
- Try manually typing a forbidden URL (e.g. log in as student then go to
  `/admin`). You should be redirected to `/unauthorized`.
- Sign out and try to access any `/student` URL — you should be redirected to
  `/login`.

If these work, Phase 0 is complete.

---

## Project structure

```
app/
  (auth)/              login, register
  (dashboard)/         role-protected dashboards
    layout.tsx         shared sidebar shell
    student/
    supervisor/
    panel/
    hod/
    admin/
  api/auth/logout      logout endpoint
  page.tsx             landing page
  layout.tsx           root layout
  globals.css

components/
  layout/              sidebar, dashboard primitives

lib/
  supabase/            three clients (browser, server, admin)
  rbac/                role -> route mapping
  utils.ts             cn() helper

middleware.ts          auth + RBAC gate (runs on every request)

supabase/
  migrations/
    001_initial_schema.sql   <-- RUN THIS IN SQL EDITOR
  seed.sql                   guidance for test data
```

---

## What is deliberately missing (Phase 1+ work)

- Project proposal submission flow
- Title similarity engine (`lib/similarity/title-check.ts`)
- Plagiarism pipeline (PDF extract → n-gram → cosine, Edge Function)
- Supervision session forms & timeline
- Defense scheduling and rubric scorer
- Archive browser & no-download PDF viewer
- Department / programme / user management screens

Each of these will be added on top of the existing Phase 0 foundation. The
schema, RBAC, and storage layout already accommodate all of it.

---

## Build phases

| Phase | Weeks | Deliverables |
|------:|-------|--------------|
| 0     | 1     | Auth, RBAC, schema, dashboards (this repo) |
| 1     | 2-5   | Title similarity, plagiarism pipeline (de-risk) |
| 2     | 6-9   | Supervision flow, defense scoring |
| 3     | 10-12 | Archive browser, PDF viewer, search |
| 4     | 13-14 | Hardening, testing, threshold tuning |
| 5     | 15-16 | Report writing, defense prep |

---

## Defense talking points (memorise these)

- **Architecture**: "Three-tier — React presentation, Next.js application
  layer with middleware-enforced RBAC, Supabase Postgres data layer with
  row-level security."
- **Why RLS in addition to middleware?** "Defense in depth. Middleware
  blocks at HTTP, RLS blocks at the database. A misconfigured API can't
  leak data because Postgres itself enforces the policy."
- **Plagiarism scope**: "Intra-corpus detection against the institutional
  archive — not a Turnitin replacement. It catches the highest-risk source
  of duplication: students recycling prior UMaT projects."

---

## License

Final-year academic project. Not for commercial redistribution.
