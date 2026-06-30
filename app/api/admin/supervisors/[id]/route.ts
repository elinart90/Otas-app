import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendNotification } from '@/lib/notifications/send';

// PATCH /api/admin/supervisors/[id]  { action: 'approve' | 'deactivate' }
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const isActive = body.action === 'approve';

  const admin = createAdminClient();

  // Update DB
  const { error: dbError } = await admin
    .from('users')
    .update({ is_active: isActive })
    .eq('id', params.id)
    .eq('role', 'supervisor');

  if (dbError) return NextResponse.json({ ok: false, error: dbError.message }, { status: 500 });

  // Sync auth metadata so middleware reads it instantly (no extra DB call)
  await admin.auth.admin.updateUserById(params.id, {
    user_metadata: { is_active: isActive },
  });

  // Notify the supervisor of the approval/deactivation
  if (isActive) {
    await sendNotification({
      userId: params.id,
      type: 'supervisor_approved',
      title: 'Your supervisor account has been approved',
      body: 'An administrator has approved your account. You can now log in and start supervising student projects.',
      link: '/supervisor',
    });
  }

  return NextResponse.json({ ok: true, is_active: isActive });
}
