import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendNotification } from '@/lib/notifications/send';

// GET /api/student/groups — current student's group + roster entry
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('role, index_number, is_group_leader, is_final_year')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'student' || !profile.is_final_year) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();

  // Find the roster entry for this student
  const { data: roster } = await admin
    .from('admin_group_roster')
    .select('*')
    .contains('member_indexes', [profile.index_number])
    .maybeSingle();

  // Find any existing group this student belongs to
  const { data: membership } = await admin
    .from('student_group_members')
    .select('group_id, is_leader, student_groups(id, group_number, academic_year, supervisor_id, created_at)')
    .eq('user_id', user.id)
    .maybeSingle();

  let groupMembers = null;
  if (membership?.group_id) {
    const { data: members } = await admin
      .from('student_group_members')
      .select('is_leader, user_id, users(full_name, index_number, email)')
      .eq('group_id', membership.group_id);
    groupMembers = members;
  }

  return NextResponse.json({
    ok: true,
    data: {
      roster,
      membership: membership ?? null,
      members: groupMembers ?? [],
      isLeader: profile.is_group_leader,
    },
  });
}

// POST /api/student/groups — leader creates the group
const CreateGroupSchema = z.object({
  roster_id: z.string().uuid(),
  group_number: z.number().int().min(1),
  academic_year: z.number().int(),
});

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('role, is_group_leader, is_final_year, index_number')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'student' || !profile.is_final_year || !profile.is_group_leader) {
    return NextResponse.json({ ok: false, error: 'Only group leaders can create groups' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = CreateGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 422 }
    );
  }

  const { roster_id, group_number, academic_year } = parsed.data;
  const admin = createAdminClient();

  // Verify the roster entry matches and is unclaimed
  const { data: roster } = await admin
    .from('admin_group_roster')
    .select('*')
    .eq('id', roster_id)
    .eq('group_number', group_number)
    .eq('academic_year', academic_year)
    .eq('is_claimed', false)
    .eq('leader_index', profile.index_number)
    .single();

  if (!roster) {
    return NextResponse.json(
      { ok: false, error: 'Roster entry not found or already claimed' },
      { status: 409 }
    );
  }

  // Check leader isn't already in a group
  const { data: existing } = await admin
    .from('student_group_members')
    .select('group_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: false, error: 'You are already in a group' }, { status: 409 });
  }

  // Create the group
  const { data: group, error: groupError } = await admin
    .from('student_groups')
    .insert({ roster_id, group_number, academic_year, created_by: user.id })
    .select()
    .single();

  if (groupError) {
    const msg = groupError.code === '23505'
      ? 'This group number has already been taken'
      : groupError.message;
    return NextResponse.json({ ok: false, error: msg }, { status: 409 });
  }

  // Find registered members by index number
  const { data: registeredMembers } = await admin
    .from('users')
    .select('id, index_number')
    .in('index_number', roster.member_indexes)
    .eq('role', 'student');

  const memberRows = (registeredMembers ?? []).map((m) => ({
    group_id: group.id,
    user_id: m.id,
    is_leader: m.index_number === roster.leader_index,
  }));

  if (memberRows.length > 0) {
    await admin.from('student_group_members').insert(memberRows);
  }

  // Mark roster as claimed
  await admin
    .from('admin_group_roster')
    .update({ is_claimed: true })
    .eq('id', roster_id);

  // Notify all registered members (except the leader who just acted)
  const memberUserIds = memberRows
    .filter((m) => !m.is_leader)
    .map((m) => m.user_id);

  await Promise.all(
    memberUserIds.map((memberId) =>
      sendNotification({
        userId: memberId,
        type: 'group_created',
        title: `Group ${group_number} has been created`,
        body: `Your group leader has created Group ${group_number} for the ${academic_year} cohort. View your group details.`,
        link: '/student/group',
        emailData: { groupNumber: group_number, academicYear: academic_year },
      })
    )
  );

  return NextResponse.json({ ok: true, data: group }, { status: 201 });
}
