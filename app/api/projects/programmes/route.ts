import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  // Return all active programmes. Students who already have a programme_id
  // on their profile can have the form preselect it; otherwise they pick.
  const { data: programmes, error } = await supabase
    .from('programmes')
    .select('id, name, code, department_id, departments:department_id(name)')
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Also return the user's own programme so the form can preselect
  const { data: profile } = await supabase
    .from('users')
    .select('programme_id')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    ok: true,
    programmes: programmes ?? [],
    userProgrammeId: profile?.programme_id ?? null,
  });
}
