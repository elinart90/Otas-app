import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendNotification } from '@/lib/notifications/send';

const INDEX_REGEX = /^[A-Z]{2,6}\.\d{2}\.\d{3}\.\d{3}\.\d{2}$/;

const RosterSchema = z.object({
  academic_year: z.number().int().min(2000).max(2100),
  group_number: z.number().int().min(1),
  member_indexes: z
    .array(z.string().regex(INDEX_REGEX, 'Invalid index number format'))
    .min(1, 'At least one member required')
    .max(5, 'Maximum 5 members per group'),
});

// GET /api/admin/groups/roster — list all roster entries
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('admin_group_roster')
    .select('*, uploader:uploaded_by(full_name)')
    .order('academic_year', { ascending: false })
    .order('group_number');

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

// DELETE /api/admin/groups/roster?id=xxx — remove an unclaimed entry
export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get('id');
  const year = req.nextUrl.searchParams.get('year');

  if (!id && !year) {
    return NextResponse.json({ ok: false, error: 'Provide id (single) or year (bulk)' }, { status: 400 });
  }

  const admin = createAdminClient();

  if (year) {
    // Bulk delete: remove all UNCLAIMED entries for the given academic year
    const { data: deleted, error } = await admin
      .from('admin_group_roster')
      .delete()
      .eq('academic_year', parseInt(year, 10))
      .eq('is_claimed', false)
      .select('id');

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: deleted?.length ?? 0 });
  }

  // Single delete
  const { error } = await admin
    .from('admin_group_roster')
    .delete()
    .eq('id', id!)
    .eq('is_claimed', false); // safety: never delete claimed entries

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// POST /api/admin/groups/roster — add a single group entry
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = RosterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 422 }
    );
  }

  const { academic_year, group_number, member_indexes } = parsed.data;
  const leader_index = member_indexes[0];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('admin_group_roster')
    .insert({ academic_year, group_number, leader_index, member_indexes, uploaded_by: user.id })
    .select()
    .single();

  if (error) {
    const msg = error.code === '23505'
      ? `Group ${group_number} already exists for ${academic_year}`
      : error.message;
    return NextResponse.json({ ok: false, error: msg }, { status: 409 });
  }

  // Flag the leader in users table if they've already registered
  const { data: leaderUser } = await admin
    .from('users')
    .update({ is_group_leader: true })
    .eq('index_number', leader_index)
    .eq('role', 'student')
    .select('id')
    .maybeSingle();

  // Notify the leader if they have an account
  if (leaderUser?.id) {
    await sendNotification({
      userId: leaderUser.id,
      type: 'group_leader_assigned',
      title: 'You are a Group Leader',
      body: `You have been designated as the leader for Group ${group_number} (${academic_year} cohort). Log in to create your group.`,
      link: '/student/group',
      emailData: { groupNumber: group_number, academicYear: academic_year },
    });
  }

  return NextResponse.json({ ok: true, data }, { status: 201 });
}
