import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ELIGIBLE_FOR_STAGE: Record<string, string[]> = {
  synopsis: ['in_supervision'],
  final: ['synopsis_passed', 'in_supervision'],
};

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const stage = searchParams.get('stage') ?? 'synopsis';
  const statuses = ELIGIBLE_FOR_STAGE[stage] ?? ELIGIBLE_FOR_STAGE.synopsis;

  const { data, error } = await supabase
    .from('projects')
    .select(
      `id, title, status, academic_year, supervisor_id,
       supervisor:supervisor_id(full_name),
       author:created_by(full_name, index_number)`
    )
    .in('status', statuses)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, projects: data ?? [] });
}
