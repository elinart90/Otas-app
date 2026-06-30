import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const SearchSchema = z.object({
  q: z.string().max(200).optional(),
  year: z.coerce.number().int().min(2000).max(2099).optional(),
  programme_id: z.string().uuid().optional(),
});

// =========================================================================
// GET /api/archive/public — unauthenticated archive browse
// Returns metadata only (title, abstract, keywords, authors). No PDF URLs.
// =========================================================================
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = SearchSchema.safeParse({
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

  const admin = createAdminClient();

  let query = admin
    .from('projects')
    .select(
      `id, title, abstract, keywords, academic_year, created_at, group_id,
       programme:programme_id(name, code),
       author:created_by(full_name),
       members:project_members(role_in_team, user:user_id(full_name, index_number)),
       archives:archives(id, archive_code)`
    )
    .eq('status', 'archived')
    .eq('is_seed', false)
    .order('academic_year', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);

  if (year) query = query.eq('academic_year', year);
  if (programme_id) query = query.eq('programme_id', programme_id);
  if (q && q.trim().length > 0) {
    const pattern = `%${q.trim().replace(/[%_]/g, '')}%`;
    query = query.or(`title.ilike.${pattern},abstract.ilike.${pattern}`);
  }

  const [{ data, error }, yearsRes, programmesRes] = await Promise.all([
    query,
    admin
      .from('projects')
      .select('academic_year')
      .eq('status', 'archived')
      .eq('is_seed', false)
      .order('academic_year', { ascending: false }),
    admin.from('programmes').select('id, name, code').order('name'),
  ]);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const distinctYears = Array.from(
    new Set((yearsRes.data ?? []).map((y) => y.academic_year))
  );

  return NextResponse.json({
    ok: true,
    archives: data ?? [],
    years: distinctYears,
    programmes: programmesRes.data ?? [],
  });
}
