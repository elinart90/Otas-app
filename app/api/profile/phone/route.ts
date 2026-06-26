import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const phone = (body.phone ?? '').trim();

  if (!phone) return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from('users')
    .update({ phone })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
