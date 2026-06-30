import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendNotification } from '@/lib/notifications/send';

// PATCH /api/admin/groups/[id]  { supervisor_id: string | null }
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

  const { supervisor_id } = await req.json();
  const admin = createAdminClient();

  // Verify supervisor exists and is approved (if not null)
  if (supervisor_id) {
    const { data: sv } = await admin
      .from('users')
      .select('id, role, is_active')
      .eq('id', supervisor_id)
      .single();
    if (!sv || sv.role !== 'supervisor' || !sv.is_active) {
      return NextResponse.json(
        { ok: false, error: 'Supervisor not found or not yet approved' },
        { status: 422 }
      );
    }
  }

  const { data, error } = await admin
    .from('student_groups')
    .update({ supervisor_id: supervisor_id ?? null })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Notify supervisor and group leader when a supervisor is assigned (not unassigned)
  if (supervisor_id && data) {
    // Get group leader
    const { data: leaderMember } = await admin
      .from('student_group_members')
      .select('user_id')
      .eq('group_id', params.id)
      .eq('is_leader', true)
      .maybeSingle();

    await Promise.all([
      // Notify supervisor
      sendNotification({
        userId: supervisor_id,
        type: 'supervisor_assigned',
        title: `You have been assigned to Group ${data.group_number}`,
        body: `You are now supervising Group ${data.group_number} (${data.academic_year} cohort). View the group on your dashboard.`,
        link: '/supervisor',
        emailData: { groupNumber: data.group_number, academicYear: data.academic_year },
      }),
      // Notify group leader
      ...(leaderMember
        ? [sendNotification({
            userId: leaderMember.user_id,
            type: 'supervisor_assigned',
            title: 'A supervisor has been assigned to your group',
            body: `Your group (Group ${data.group_number}) now has a supervisor. You can view their details on your group page.`,
            link: '/student/group',
            emailData: { groupNumber: data.group_number, academicYear: data.academic_year },
          })]
        : []),
    ]);
  }

  return NextResponse.json({ ok: true, data });
}
