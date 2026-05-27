import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  // Look up the project's supervisor so we can exclude them from the list
  let supervisorIdToExclude: string | null = null;
  if (projectId) {
    const { data: project } = await supabase
      .from('projects')
      .select('supervisor_id')
      .eq('id', projectId)
      .single();
    supervisorIdToExclude = project?.supervisor_id ?? null;
  }

  let q = supabase
    .from('eligible_panelists')
    .select('id, full_name, email, role, staff_id')
    .order('full_name', { ascending: true });

  if (supervisorIdToExclude) {
    q = q.neq('id', supervisorIdToExclude);
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, panelists: data ?? [] });
}
