import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseAdmissionYear } from '@/lib/student-level';

// GET /api/student/groups/available
// Returns unclaimed group numbers for this student's academic year cohort.
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('role, index_number, is_group_leader, is_final_year')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'student' || !profile.is_final_year || !profile.is_group_leader) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const admYear = profile.index_number ? parseAdmissionYear(profile.index_number) : null;
  if (!admYear) return NextResponse.json({ ok: false, error: 'Invalid index number' }, { status: 400 });

  const graduationYear = admYear + 4;
  const admin = createAdminClient();

  // Get the leader's roster entry for their cohort, along with all unclaimed entries for context
  const { data: myRoster } = await admin
    .from('admin_group_roster')
    .select('*')
    .eq('leader_index', profile.index_number)
    .eq('is_claimed', false)
    .maybeSingle();

  // Get all unclaimed group numbers for this cohort year
  const { data: available } = await admin
    .from('admin_group_roster')
    .select('id, group_number')
    .eq('academic_year', graduationYear)
    .eq('is_claimed', false)
    .order('group_number');

  // Also load the member names for the leader's own roster entry
  let memberDetails = null;
  if (myRoster) {
    const { data: members } = await admin
      .from('users')
      .select('id, full_name, index_number, programme_id')
      .in('index_number', myRoster.member_indexes)
      .eq('role', 'student');

    // Merge: keep order from roster, mark unregistered ones
    memberDetails = myRoster.member_indexes.map((idx: string) => {
      const found = members?.find((m) => m.index_number === idx);
      return found
        ? { ...found, registered: true, is_leader: idx === myRoster.leader_index }
        : { index_number: idx, full_name: null, registered: false, is_leader: idx === myRoster.leader_index };
    });
  }

  return NextResponse.json({
    ok: true,
    data: {
      myRoster,
      available: available ?? [],
      memberDetails,
      graduationYear,
    },
  });
}
