import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DefenseCreateSchema, type DefenseStage } from '@/lib/defense/schema';

// =========================================================================
// POST /api/defense
// Atomic create: defense_sessions row + N panel_assignments rows.
// Body: JSON body matching DefenseCreateSchema.
// =========================================================================
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  // Caller must be HoD or admin
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !['hod', 'admin'].includes(profile.role)) {
    return NextResponse.json(
      { ok: false, error: 'Only HoD or admin can schedule defenses' },
      { status: 403 }
    );
  }

  // Parse + validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = DefenseCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // Verify project exists, get its supervisor + status
  const { data: project } = await supabase
    .from('projects')
    .select('id, status, supervisor_id, title')
    .eq('id', input.project_id)
    .single();
  if (!project) {
    return NextResponse.json({ ok: false, error: 'Project not found' }, { status: 404 });
  }

  // Status gate per stage
  const eligibleForStage: Record<DefenseStage, string[]> = {
    synopsis: ['in_supervision'],
    final: ['synopsis_passed', 'in_supervision'], // Some institutions allow final without synopsis
  };
  if (!eligibleForStage[input.stage].includes(project.status)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Project status "${project.status}" is not eligible for ${input.stage} defense.`,
      },
      { status: 409 }
    );
  }

  // Block scheduling if a defense for this stage is already active
  const { data: existing } = await supabase
    .from('defense_sessions')
    .select('id, status')
    .eq('project_id', project.id)
    .eq('stage', input.stage)
    .in('status', ['scheduled', 'in_progress'])
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      {
        ok: false,
        error: `A ${input.stage} defense is already scheduled for this project.`,
      },
      { status: 409 }
    );
  }

  // Reject if any panelist is the project's supervisor
  if (input.panelist_ids.includes(project.supervisor_id ?? '')) {
    return NextResponse.json(
      {
        ok: false,
        error: 'A project supervisor cannot be on their own panel.',
      },
      { status: 422 }
    );
  }

  // Verify all panelists exist and are eligible (active staff)
  const { data: validPanelists } = await supabase
    .from('eligible_panelists')
    .select('id')
    .in('id', input.panelist_ids);
  if (!validPanelists || validPanelists.length !== input.panelist_ids.length) {
    return NextResponse.json(
      {
        ok: false,
        error: 'One or more selected panelists are not eligible (inactive or wrong role).',
      },
      { status: 422 }
    );
  }

  // ===== Atomic write =====
  // Use admin client because we want all-or-nothing semantics across two tables.
  // RLS would otherwise leave us with an orphan defense_sessions row if any
  // panel_assignments insert failed silently.
  const admin = createAdminClient();

  const { data: defense, error: defenseErr } = await admin
    .from('defense_sessions')
    .insert({
      project_id: input.project_id,
      stage: input.stage,
      scheduled_at: input.scheduled_at,
      venue: input.venue,
      status: 'scheduled',
      scheduled_by: user.id,
    })
    .select('id')
    .single();
  if (defenseErr || !defense) {
    return NextResponse.json(
      { ok: false, error: `Failed to create defense: ${defenseErr?.message}` },
      { status: 500 }
    );
  }

  // Bulk insert panel assignments
  const assignments = input.panelist_ids.map((pid) => ({
    defense_id: defense.id,
    panelist_id: pid,
    role: 'panelist',
  }));
  const { error: assignErr } = await admin
    .from('panel_assignments')
    .insert(assignments);
  if (assignErr) {
    // Roll back the defense row
    await admin.from('defense_sessions').delete().eq('id', defense.id);
    return NextResponse.json(
      { ok: false, error: `Failed to assign panel: ${assignErr.message}` },
      { status: 500 }
    );
  }

  // Bump project status to <stage>_scheduled
  const newProjectStatus =
    input.stage === 'synopsis' ? 'synopsis_scheduled' : 'final_scheduled';
  await admin
    .from('projects')
    .update({ status: newProjectStatus })
    .eq('id', input.project_id);

  return NextResponse.json({ ok: true, defenseId: defense.id });
}

// =========================================================================
// GET /api/defense
// Returns defenses visible to the caller.
// =========================================================================
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('defense_sessions')
    .select(
      `id, stage, scheduled_at, venue, status, created_at,
       project_id,
       projects:project_id(title, supervisor_id),
       panel:panel_assignments(panelist_id, users:panelist_id(full_name))`
    )
    .order('scheduled_at', { ascending: true })
    .limit(200);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, defenses: data ?? [] });
}
