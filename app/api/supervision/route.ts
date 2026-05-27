import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SessionCreateSchema } from '@/lib/supervision/schema';

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

// =========================================================================
// POST /api/supervision
// Multipart form with `meta` (JSON of SessionCreateSchema) and optional `file`.
// =========================================================================
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  // Caller must be a supervisor
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || profile.role !== 'supervisor') {
    return NextResponse.json(
      { ok: false, error: 'Only supervisors may log sessions' },
      { status: 403 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }

  const metaRaw = formData.get('meta');
  if (typeof metaRaw !== 'string') {
    return NextResponse.json({ ok: false, error: 'Missing session metadata' }, { status: 400 });
  }
  let metaJson: unknown;
  try {
    metaJson = JSON.parse(metaRaw);
  } catch {
    return NextResponse.json({ ok: false, error: 'meta is not valid JSON' }, { status: 400 });
  }
  const parsed = SessionCreateSchema.safeParse(metaJson);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid session data' },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // Verify caller is the supervisor for this project
  const { data: project } = await supabase
    .from('projects')
    .select('id, supervisor_id, status')
    .eq('id', input.project_id)
    .single();
  if (!project) {
    return NextResponse.json({ ok: false, error: 'Project not found' }, { status: 404 });
  }
  if (project.supervisor_id !== user.id) {
    return NextResponse.json(
      { ok: false, error: 'You are not the supervisor for this project' },
      { status: 403 }
    );
  }
  // Block logging sessions on projects that haven't been approved yet
  const allowedStatuses = new Set([
    'proposal_approved',
    'in_supervision',
    'synopsis_scheduled',
    'synopsis_passed',
    'final_scheduled',
  ]);
  if (!allowedStatuses.has(project.status)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Sessions can only be logged on approved projects (current: ${project.status})`,
      },
      { status: 409 }
    );
  }

  // Insert the session row
  const { data: session, error: insertErr } = await supabase
    .from('supervisions')
    .insert({
      project_id: input.project_id,
      supervisor_id: user.id,
      session_date: input.session_date,
      agenda: input.agenda,
      notes: input.notes,
      outcome: input.outcome,
      next_steps: input.next_steps,
    })
    .select('id')
    .single();
  if (insertErr || !session) {
    return NextResponse.json(
      { ok: false, error: `Failed to log session: ${insertErr?.message}` },
      { status: 500 }
    );
  }

  // Optional attachment
  const file = formData.get('file');
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      // Session is already created; just skip the attachment with a warning.
      return NextResponse.json({
        ok: true,
        sessionId: session.id,
        warning: 'Session logged, but attachment exceeded 10MB and was skipped.',
      });
    }
    const safeName = file.name.replace(/[^\w.\-]/g, '_').slice(0, 100);
    const path = `${user.id}/${session.id}/${Date.now()}-${safeName}`;
    const buf = await file.arrayBuffer();
    const { error: upErr } = await supabase.storage
      .from('supervision-attachments')
      .upload(path, buf, { contentType: file.type, upsert: false });
    if (upErr) {
      return NextResponse.json({
        ok: true,
        sessionId: session.id,
        warning: `Session logged, but attachment upload failed: ${upErr.message}`,
      });
    }
    await supabase.from('supervision_attachments').insert({
      supervision_id: session.id,
      file_url: path,
      file_name: file.name,
      file_size_bytes: file.size,
      mime_type: file.type,
    });
  }

  // After the first session on an approved project, bump project status to in_supervision
  if (project.status === 'proposal_approved') {
    await supabase
      .from('projects')
      .update({ status: 'in_supervision' })
      .eq('id', project.id);
  }

  return NextResponse.json({ ok: true, sessionId: session.id });
}

// =========================================================================
// GET /api/supervision?projectId=<uuid>
// Returns sessions visible to the caller (role-aware via RLS).
// Optional projectId filters to a single project.
// =========================================================================
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  let q = supabase
    .from('supervisions')
    .select(
      `id, session_date, agenda, notes, outcome, next_steps, created_at,
       project_id, supervisor_id,
       projects:project_id(title),
       supervisor:supervisor_id(full_name),
       attachments:supervision_attachments(id, file_name, file_size_bytes, mime_type, file_url)`
    )
    .order('session_date', { ascending: false })
    .limit(200);

  if (projectId) q = q.eq('project_id', projectId);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sessions: data ?? [] });
}
