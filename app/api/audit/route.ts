import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AuditQuerySchema } from '@/lib/audit/schema';

// =========================================================================
// GET /api/audit
//
// Returns paginated archive view records. Only admins and HoDs may call this
// (the av_read_admin RLS policy already enforces this at the DB layer, but
// the API gates first for clearer error messages).
//
// Query params: q (free text), from (YYYY-MM-DD), to (YYYY-MM-DD),
//               page (default 1), pageSize (default 25, max 100)
// =========================================================================
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !['admin', 'hod'].includes(profile.role)) {
    return NextResponse.json(
      { ok: false, error: 'Only administrators and HoDs may view the audit log' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = AuditQuerySchema.safeParse({
    q: searchParams.get('q') ?? undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid filters' },
      { status: 400 }
    );
  }
  const { q, from, to, page, pageSize } = parsed.data;

  // The archive_views table joins to users, archives, and projects via FKs.
  // We embed all three so the result is a single ready-to-render row.
  let query = supabase
    .from('archive_views')
    .select(
      `id, viewed_at, user_agent,
       user:users!archive_views_user_id_fkey(id, full_name, email, role),
       archive:archives!archive_views_archive_id_fkey(
         id, archive_code,
         project:projects(id, title, academic_year)
       )`,
      { count: 'exact' }
    )
    .order('viewed_at', { ascending: false });

  // Date range — interpret as UTC day boundaries
  if (from) query = query.gte('viewed_at', `${from}T00:00:00Z`);
  if (to) query = query.lte('viewed_at', `${to}T23:59:59.999Z`);

  // Pagination using range (0-indexed, inclusive)
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  query = query.range(start, end);

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Free-text filter: applied client-side on the page rows because
  // PostgREST's OR filter syntax across joined tables is unreliable.
  // For a corpus this size (< 1M views over an academic year), this is fine.
  // Phase 5 hardening note: switch to a server-side full-text search if
  // archive_views grows past 100k rows.
  let filtered = data ?? [];
  if (q && q.trim().length > 0) {
    const needle = q.trim().toLowerCase();
    filtered = filtered.filter((row: any) => {
      const haystack = [
        row.user?.full_name,
        row.user?.email,
        row.archive?.archive_code,
        row.archive?.project?.title,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }

  return NextResponse.json({
    ok: true,
    rows: filtered,
    total: count ?? 0,
    page,
    pageSize,
    pages: count ? Math.ceil(count / pageSize) : 0,
  });
}
