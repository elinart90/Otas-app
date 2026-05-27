import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  const { data: defense, error } = await supabase
    .from('defense_sessions')
    .select(
      `id, stage, scheduled_at, venue, status, created_at, project_id,
       projects:project_id(
         id, title, abstract, supervisor_id,
         supervisor:supervisor_id(full_name),
         author:created_by(full_name, index_number)
       ),
       panel:panel_assignments(
         panelist_id, role,
         users:panelist_id(full_name, email, role)
       )`
    )
    .eq('id', params.id)
    .single();

  if (error || !defense) {
    return NextResponse.json(
      { ok: false, error: 'Defense not found or you do not have access' },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, defense });
}
