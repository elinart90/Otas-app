import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/notifications?limit=20
// Returns recent notifications for the authenticated user.
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20'), 50);

  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, link, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const unreadCount = (data ?? []).filter((n) => !n.is_read).length;
  return NextResponse.json({ ok: true, data: data ?? [], unreadCount });
}

// PATCH /api/notifications  { ids: string[] | 'all' }
// Marks notifications as read.
export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });

  const { ids } = await req.json();
  const admin = createAdminClient();

  let query = admin
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id);

  if (ids !== 'all' && Array.isArray(ids)) {
    query = query.in('id', ids);
  }

  const { error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
