import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  // Single supervisor lookup by ID (used by proposal form to show assigned supervisor)
  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('id', id)
      .eq('role', 'supervisor')
      .single();
    if (error || !data) {
      return NextResponse.json({ ok: false, error: 'Supervisor not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, supervisor: data });
  }

  // List all supervisors (kept for admin/hod use)
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, staff_id, department_id')
    .eq('role', 'supervisor')
    .order('full_name', { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, supervisors: data ?? [] });
}
