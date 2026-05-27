import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ProposalDecisionSchema } from '@/lib/projects/schema';

// =========================================================================
// GET /api/projects/[id]
// =========================================================================
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  const { data: project, error } = await supabase
    .from('projects')
    .select(
      `
        id, title, abstract, keywords, academic_year, status,
        proposal_doc_url, final_doc_url, created_at, updated_at,
        created_by, supervisor_id, programme_id,
        author:created_by(full_name, email, index_number),
        supervisor:supervisor_id(full_name, email)
      `
    )
    .eq('id', params.id)
    .single();

  if (error || !project) {
    return NextResponse.json(
      { ok: false, error: 'Project not found or you do not have access' },
      { status: 404 }
    );
  }

  // Generate a signed URL for the proposal PDF if it exists
  let proposalDocSignedUrl: string | null = null;
  if (project.proposal_doc_url) {
    const { data: signed } = await supabase.storage
      .from('project-documents')
      .createSignedUrl(project.proposal_doc_url, 60 * 15); // 15 min
    proposalDocSignedUrl = signed?.signedUrl ?? null;
  }

  return NextResponse.json({
    ok: true,
    project: { ...project, proposalDocSignedUrl },
  });
}

// =========================================================================
// PATCH /api/projects/[id]
// Supervisor approves or rejects a submitted proposal.
// =========================================================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  // Caller must be supervisor or hod/admin
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !['supervisor', 'hod', 'admin'].includes(profile.role)) {
    return NextResponse.json(
      { ok: false, error: 'Only supervisors can decide on proposals' },
      { status: 403 }
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = ProposalDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid decision' },
      { status: 400 }
    );
  }

  // Fetch the project to verify the supervisor relationship and status
  const { data: project, error: fetchErr } = await supabase
    .from('projects')
    .select('id, supervisor_id, status, abstract')
    .eq('id', params.id)
    .single();
  if (fetchErr || !project) {
    return NextResponse.json({ ok: false, error: 'Project not found' }, { status: 404 });
  }

  if (profile.role === 'supervisor' && project.supervisor_id !== user.id) {
    return NextResponse.json(
      { ok: false, error: 'You are not the supervisor for this project' },
      { status: 403 }
    );
  }
  if (project.status !== 'proposal_submitted') {
    return NextResponse.json(
      { ok: false, error: `Cannot decide a project currently in status: ${project.status}` },
      { status: 409 }
    );
  }

  const newStatus =
    parsed.data.decision === 'approve' ? 'proposal_approved' : 'proposal_rejected';

  // For rejection, append the reason to the abstract (simplest persistence
  // without a new column). Production would have a separate decisions table;
  // we keep that for Phase 4 hardening.
  const updates: Record<string, unknown> = { status: newStatus };
  if (parsed.data.decision === 'reject') {
    updates.abstract =
      (project.abstract ?? '') +
      `\n\n— Supervisor rejection reason (${new Date().toISOString().slice(0, 10)}):\n${parsed.data.reason}`;
  }

  const { error: updateErr } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', params.id);

  if (updateErr) {
    return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, newStatus });
}
