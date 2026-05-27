# Phase 4 — Hardening (Audit UI + Input Validation)

Scope: **two features, narrowly built.**
1. Audit log UI for admin and HoD (visible record of every archive view)
2. Input validation hardening (Zod + DB CHECK constraints, defence in depth)

The other Phase 4 candidates (rate limiting, error logging, StrictMode proper
fix, threshold calibration) are documented in `PHASE_4_BACKLOG.md`.

---

## Files in this zip (11 source + 1 doc)

| File | Action |
|---|---|
| `supabase/migrations/012_input_constraints.sql` | NEW — DB-level input bounds |
| `lib/audit/schema.ts` | NEW — Zod for audit query filters |
| `lib/validation/sanitize.ts` | NEW — shared input cleansing helpers |
| `lib/validation/archive-schema.ts` | NEW — tightened archive_code regex |
| `lib/validation/projects-schema.ts` | NEW — tightened title/abstract/keywords |
| `lib/validation/defense-schema.ts` | NEW — tightened venue/notes/scores |
| `app/api/audit/route.ts` | NEW — GET audit log endpoint with filters |
| `components/audit/audit-table.tsx` | NEW — reusable filterable table |
| `app/(dashboard)/admin/audit/page.tsx` | NEW — admin audit page |
| `app/(dashboard)/hod/audit/page.tsx` | NEW — HoD audit page |
| `components/layout/sidebar.tsx` | **REPLACES** existing — adds Audit log nav for admin + HoD |

---

## Deployment

### Step 1 — Extract zip into project root

Overwrite `components/layout/sidebar.tsx` when prompted (only file that
replaces something existing).

### Step 2 — Run migration 012

In Supabase SQL Editor, paste and run `supabase/migrations/012_input_constraints.sql`.

**Expected:** 9 DO blocks, all succeed silently.

**If any constraint fails to add** with "violates check constraint" — that
means existing seed data already breaks the new bounds. Most likely candidate:
the seeded archive codes from migration 003 don't match the new
`ARC-YYYY-XXX` regex (some seed codes use `ARC-2024-NNY` shape, which DOES
match; others may use `placeholder://` shape and so the DB row has placeholder
data in `document_url` not `archive_code` — but check anyway).

To diagnose any constraint failure:
```sql
-- Find archive codes that don't match the new format
SELECT archive_code FROM public.archives
WHERE archive_code !~ '^ARC-[0-9]{4}-[A-Z0-9]{3,12}$';

-- Find titles that violate the new length rules
SELECT id, title, char_length(btrim(title)) AS len
FROM public.projects
WHERE char_length(btrim(title)) < 5 OR char_length(btrim(title)) > 300;
```

Clean up offending rows manually before re-running the migration.

### Step 3 — Restart `npm run dev`

No new npm packages. Just restart so the new sidebar items pick up.

---

## Integrating the new validation schemas

I created the tightened schemas in `lib/validation/*` rather than
overwriting `lib/projects/schema.ts`, `lib/defense/schema.ts`, etc.,
because I don't have your current files in front of me to safely
merge.

**Two options:**

**Option A — drop-in replace (preferred):**
Copy the contents of `lib/validation/projects-schema.ts` into your
existing `lib/projects/schema.ts`, replacing the old schemas. Same for
`defense-schema.ts` → `lib/scoring/schema.ts` + `lib/defense/schema.ts`,
and `archive-schema.ts` → `lib/archive/schema.ts`.

**Option B — re-export bridge:**
In `lib/projects/schema.ts`, replace its contents with:
```ts
export * from '@/lib/validation/projects-schema';
```
Same pattern for the other modules. Simpler, but adds an import hop.

Either way, after merging, run your test flows (submit a proposal, score
a defense, schedule a defense, upload an archive) and confirm the
tighter validation messages appear when you pass bad input.

---

## Testing the audit UI

### Sub-test 1 — admin view

1. Sign in as admin
2. Sidebar should now show a new **Audit log** entry
3. Click it → table loads with archive_views rows from the last 30 days
4. Try the search box — type "Nartey" → only rows where you're the viewer appear
5. Change the From date back 90 days → more rows appear
6. Change the To date to a week ago → recent rows disappear
7. Pagination should appear if you have more than 25 rows

### Sub-test 2 — HoD view

1. Sign in as HoD (Odii Elijah)
2. Sidebar → **Audit log** appears in HoD's nav (alongside Dashboard, Overview, Approvals)
3. Click it → same table, slightly different subtitle ("Department-wide record…")

### Sub-test 3 — non-privileged roles cannot access

1. Sign in as student
2. URL bar → manually navigate to `/admin/audit`
3. Should redirect to `/unauthorized` (middleware path-gate)

### Sub-test 4 — API enforces role even on direct fetch

1. Sign in as student
2. Open `http://localhost:3000/api/audit` directly in a tab
3. Should return `{"ok":false,"error":"Only administrators and HoDs may view the audit log"}`

---

## Testing the validation hardening

After integrating the new schemas:

| Test | Expected |
|---|---|
| Submit a project with title = "abc" (3 chars) | Validation error "Title is too short" |
| Submit a project with abstract = "short" | Validation error "Abstract is too short" |
| Try to use 11 keywords | Validation error "Maximum 10 keywords" or silently truncates to 10 |
| Submit archive with code = "lowercase" | Validation error "Archive code must be ARC-YYYY-XXX" |
| Submit archive with code = "ARC-26-A" (2-digit year) | Same error |
| HoD enters decision_notes = "ok" (2 chars) | Validation error "Decision notes must be at least 20 characters" |
| Paste a title with weird zero-width spaces from Word | Silently sanitized to clean line |
| Try score = 11 | Validation error "Score cannot exceed 10" |

If any of these fail, the schemas aren't wired in correctly — verify the
import path in the relevant API route.

---

## Report scaffold update

> **4.10 Audit and Hardening (Phase 4)**
>
> Each archive document view is persisted to the `archive_views` table
> with the viewer's UUID, the archive UUID, a timestamp, and a truncated
> user-agent string. The audit log endpoint at `/api/audit` enforces
> role-based access (administrator and head-of-department only) at both
> the API boundary and through the `av_read_admin` row-level security
> policy. The corresponding administrator interface at `/admin/audit`
> exposes a filterable, paginated table of recent views with text search
> across viewer name, archive code, and project title, and structured
> date-range filtering.
>
> Input validation operates as a two-layer defence. The primary layer is
> at the API boundary using Zod schemas (`lib/validation/*`) which sanitise
> inputs (trim, strip control characters, collapse internal whitespace,
> deduplicate keywords), bound lengths, and enforce structured formats
> (e.g. archive codes must match `ARC-YYYY-XXX`). The secondary layer
> is at the database via PostgreSQL CHECK constraints (migration 012),
> which would reject malformed inserts even if the API layer were bypassed.
> This is institutional defence in depth: neither layer fully trusts the
> other.
