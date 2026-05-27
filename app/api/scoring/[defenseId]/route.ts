import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ScoreSubmissionSchema } from '@/lib/scoring/schema';

// =========================================================================
// GET /api/scoring/[defenseId]
// Returns the rubric for the defense's stage + the caller's scores (if any).
// If caller is HoD/admin, returns ALL scores for the defense.
// =========================================================================
export async function GET(
  _request: NextRequest,
  { params }: { params: { defenseId: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  // Get defense + stage
  const { data: defense, error: defErr } = await supabase
    .from('defense_sessions')
    .select('id, stage, status, project_id')
    .eq('id', params.defenseId)
    .single();
  if (defErr || !defense) {
    return NextResponse.json(
      { ok: false, error: 'Defense not found or no access' },
      { status: 404 }
    );
  }

  // Load rubric criteria for this stage
  const { data: criteria, error: critErr } = await supabase
    .from('rubric_criteria')
    .select('id, criterion, description, max_score, weight, display_order')
    .eq('stage', defense.stage)
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  if (critErr) {
    return NextResponse.json({ ok: false, error: critErr.message }, { status: 500 });
  }

  // Load scores. RLS naturally filters:
  //  - panelist: only their own scores
  //  - hod/admin: all scores for the defense
  //  - student: only if HoD has decided (won't be used in this UI)
  const { data: scores } = await supabase
    .from('defense_scores')
    .select('id, panelist_id, criterion_id, score, comment, submitted')
    .eq('defense_id', params.defenseId);

  return NextResponse.json({
    ok: true,
    defense,
    criteria: criteria ?? [],
    scores: scores ?? [],
  });
}

// =========================================================================
// POST /api/scoring/[defenseId]
// Panelist saves (and optionally submits) their scores.
// =========================================================================
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

  // Verify caller is an assigned panelist for this defense
  const { data: assignment } = await supabase
    .from('panel_assignments')
    .select('panelist_id')
    .eq('defense_id', params.defenseId)
    .eq('panelist_id', user.id)
    .maybeSingle();
  if (!assignment) {
    return NextResponse.json(
      { ok: false, error: 'You are not a panel member for this defense' },
      { status: 403 }
    );
  }

  // Verify defense isn't completed/cancelled
  const { data: defense } = await supabase
    .from('defense_sessions')
    .select('status, stage')
    .eq('id', params.defenseId)
    .single();
  if (!defense) {
    return NextResponse.json({ ok: false, error: 'Defense not found' }, { status: 404 });
  }
  if (defense.status === 'completed' || defense.status === 'cancelled') {
    return NextResponse.json(
      { ok: false, error: `Defense is ${defense.status}; scoring is closed` },
      { status: 409 }
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = ScoreSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }
  const { scores: scoreInputs, submit } = parsed.data;

  // Validate each score against its criterion's max_score
  const criterionIds = scoreInputs.map((s) => s.criterion_id);
  const { data: criteria } = await supabase
    .from('rubric_criteria')
    .select('id, max_score, stage')
    .in('id', criterionIds);
  if (!criteria || criteria.length !== criterionIds.length) {
    return NextResponse.json(
      { ok: false, error: 'One or more criteria are invalid' },
      { status: 422 }
    );
  }
  for (const cr of criteria) {
    if (cr.stage !== defense.stage) {
      return NextResponse.json(
        {
          ok: false,
          error: `Criterion belongs to a different defense stage (${cr.stage}, expected ${defense.stage})`,
        },
        { status: 422 }
      );
    }
    const submitted = scoreInputs.find((s) => s.criterion_id === cr.id);
    if (submitted && submitted.score > cr.max_score) {
      return NextResponse.json(
        {
          ok: false,
          error: `Score ${submitted.score} exceeds max ${cr.max_score} for criterion`,
        },
        { status: 422 }
      );
    }
  }

  // If submit=true, require ALL criteria for this stage to have a score
  if (submit) {
    const { data: allCriteria } = await supabase
      .from('rubric_criteria')
      .select('id')
      .eq('stage', defense.stage)
      .eq('is_active', true);
    const requiredIds = new Set((allCriteria ?? []).map((c) => c.id));
    const providedIds = new Set(scoreInputs.map((s) => s.criterion_id));
    for (const reqId of requiredIds) {
      if (!providedIds.has(reqId)) {
        return NextResponse.json(
          {
            ok: false,
            error: 'All rubric criteria must be scored before submitting.',
          },
          { status: 422 }
        );
      }
    }
  }

  // Upsert each score row. We can't use a single UPSERT cleanly due to the
  // composite uniqueness on (defense_id, panelist_id, criterion_id), so we
  // do per-row upserts.
  const now = new Date().toISOString();
  for (const s of scoreInputs) {
    const { error: upsertErr } = await supabase.from('defense_scores').upsert(
      {
        defense_id: params.defenseId,
        panelist_id: user.id,
        criterion_id: s.criterion_id,
        score: s.score,
        comment: s.comment,
        submitted: submit,
        submitted_at: submit ? now : null,
      },
      { onConflict: 'defense_id,panelist_id,criterion_id' }
    );
    if (upsertErr) {
      return NextResponse.json(
        { ok: false, error: `Score save failed: ${upsertErr.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, submitted: submit });
}
