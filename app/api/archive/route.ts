import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ArchiveSearchSchema } from '@/lib/archive/schema';

// =========================================================================
// GET /api/archive?q=...&year=...&programme_id=...
// Returns archived projects (status='archived') matching the filters.
// =========================================================================
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = ArchiveSearchSchema.safeParse({
    q: searchParams.get('q') ?? undefined,
    year: searchParams.get('year') ?? undefined,
    programme_id: searchParams.get('programme_id') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid filter' },
      { status: 400 }
    );
  }
  const { q, year, programme_id } = parsed.data;

  let query = supabase
    .from('projects')
    .select(
      `id, title, abstract, keywords, academic_year, created_at,
       programme:programme_id(name, code),
       author:created_by(full_name),
       archives:archives(id, archive_code, document_url)`
    )
    .eq('status', 'archived')
    .order('academic_year', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);

  if (year) query = query.eq('academic_year', year);
  if (programme_id) query = query.eq('programme_id', programme_id);

  // Text search: title OR abstract OR any keyword.
  // Using ILIKE for the FYP scale; Phase 4 can switch to FTS if needed.
  if (q && q.trim().length > 0) {
    const pattern = `%${q.trim().replace(/[%_]/g, '')}%`;
    query = query.or(`title.ilike.${pattern},abstract.ilike.${pattern}`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Pull the distinct list of years and programmes for the filter dropdowns.
  // Done as separate queries to keep the main response shape stable.
  const { data: years } = await supabase
    .from('projects')
    .select('academic_year')
    .eq('status', 'archived')
    .order('academic_year', { ascending: false });
  const distinctYears = Array.from(
    new Set((years ?? []).map((y) => y.academic_year))
  );

  const { data: programmes } = await supabase
    .from('programmes')
    .select('id, name, code')
    .order('name');

  return NextResponse.json({
    ok: true,
    archives: data ?? [],
    years: distinctYears,
    programmes: programmes ?? [],
  });
}
