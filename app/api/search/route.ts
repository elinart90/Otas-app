import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) {
    return NextResponse.json({ archives: [], projects: [], users: [] });
  }

  const role = profile.role;
  const results: {
    archives: unknown[];
    projects: unknown[];
    users: unknown[];
  } = { archives: [], projects: [], users: [] };

  // ── Archives (visible to all roles) ──────────────────────────────────────
  const { data: archives } = await supabase
    .from('archives')
    .select('id, archive_code, year, projects(id, title, programmes(name, code))')
    .textSearch('fts', q, { type: 'websearch', config: 'english' })
    .limit(5);

  // Fallback: if FTS returns nothing try plain title match
  if (!archives?.length) {
    const { data: fallback } = await supabase
      .from('archives')
      .select('id, archive_code, year, projects(id, title, programmes(name, code))')
      .ilike('projects.title', `%${q}%`)
      .limit(5);
    results.archives = fallback ?? [];
  } else {
    results.archives = archives;
  }

  // ── Projects (supervisor / hod / admin) ───────────────────────────────────
  if (role === 'supervisor' || role === 'hod' || role === 'admin') {
    const { data: projects } = await supabase
      .from('projects')
      .select('id, title, status, academic_year')
      .ilike('title', `%${q}%`)
      .limit(5);
    results.projects = projects ?? [];
  }

  // ── Users (hod / admin) ───────────────────────────────────────────────────
  if (role === 'hod' || role === 'admin') {
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, role, email, index_number, staff_id')
      .ilike('full_name', `%${q}%`)
      .neq('id', user.id)
      .limit(5);
    results.users = users ?? [];
  }

  return NextResponse.json(results);
}
