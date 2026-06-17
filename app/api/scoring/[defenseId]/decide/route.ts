import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DecisionSchema } from '@/lib/scoring/schema';

export async function POST(
  request: NextRequest,
  { params }: { params: { defenseId: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !['hod', 'admin'].includes(profile.role)) {
    return NextResponse.json(
      { ok: false, error: 'Only HoD or admin can decide a defense' },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = DecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }
  const { decision, decision_notes } = parsed.data;

  const { data: defense } = await supabase
    .from('defense_sessions')
    .select('id, stage, status, project_id')
    .eq('id', params.defenseId)
    .single();
  if (!defense) {
    return NextResponse.json({ ok: false, error: 'Defense not found' }, { status: 404 });
  }
  if (defense.status === 'completed') {
    return NextResponse.json(
      { ok: false, error: 'Defense has already been decided' },
      { status: 409 }
    );
  }
  if (defense.status === 'cancelled') {
    return NextResponse.json(
      { ok: false, error: 'Cannot decide a cancelled defense' },
      { status: 409 }
    );
  }

  // Optional sanity check: at least one panelist has submitted scores.
  // This prevents accidental decisions before scoring happens.
  const { count: submittedCount } = await supabase
    .from('defense_scores')
    .select('*', { count: 'exact', head: true })
    .eq('defense_id', params.defenseId)
    .eq('submitted', true);
  if (!submittedCount || submittedCount === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: 'At least one panelist must submit scores before a decision can be made',
      },
      { status: 422 }
    );
  }

  // Atomic write: update defense + project status.
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error: defUpdateErr } = await admin
    .from('defense_sessions')
    .update({
      hod_decision: decision,
      decision_notes: decision_notes,
      decided_at: now,
      status: 'completed',
    })
    .eq('id', params.defenseId);
  if (defUpdateErr) {
    return NextResponse.json(
      { ok: false, error: defUpdateErr.message },
      { status: 500 }
    );
  }

  // Compute new project status
  const newProjectStatus =
    defense.stage === 'synopsis'
      ? decision === 'passed'
        ? 'synopsis_passed'
        : 'synopsis_failed'
      : decision === 'passed'
        ? 'final_passed'
        : 'final_failed';

  await admin
    .from('projects')
    .update({ status: newProjectStatus })
    .eq('id', defense.project_id);

  return NextResponse.json({ ok: true, newProjectStatus, decision });
}
