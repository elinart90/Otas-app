import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/messages?project_id=<uuid>
//
// Returns all messages for a project, ordered oldest-first.
// Also marks unread messages from the OTHER party as read (server-side,
// via admin client so RLS doesn't block the update).
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  const projectId = request.nextUrl.searchParams.get('project_id');
  if (!projectId) {
    return NextResponse.json({ ok: false, error: 'project_id is required' }, { status: 400 });
  }

  // Verify the caller is a participant (student or supervisor) for this project
  const { data: project, error: projectErr } = await supabase
    .from('projects')
    .select('id, created_by, supervisor_id')
    .eq('id', projectId)
    .single();

  if (projectErr || !project) {
    return NextResponse.json({ ok: false, error: 'Project not found' }, { status: 404 });
  }

  const isParticipant =
    project.created_by === user.id || project.supervisor_id === user.id;

  if (!isParticipant) {
    return NextResponse.json(
      { ok: false, error: 'You are not a participant in this project' },
      { status: 403 }
    );
  }

  // Use admin client so message reads work regardless of RLS SELECT policies
  const adminDb = createAdminClient();
  const { data: messages, error } = await adminDb
    .from('project_messages')
    .select(
      `id, content, is_action, is_read, created_at,
       sender:sender_id(id, full_name, role)`
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Mark messages from the OTHER party as read (fire-and-forget)
  const unreadIds = (messages ?? [])
    .filter((m) => {
      const sender = m.sender as unknown as { id: string } | null;
      return !m.is_read && sender?.id !== user.id;
    })
    .map((m) => m.id);

  if (unreadIds.length > 0) {
    // Non-blocking — fire and forget so the response is fast
    adminDb
      .from('project_messages')
      .update({ is_read: true })
      .in('id', unreadIds)
      .then(() => {/* silent */});
  }

  return NextResponse.json({ ok: true, messages: messages ?? [] });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/messages
//
// Sends a message on a project thread.
// Only students and supervisors are allowed.
// Students cannot set is_action = true.
// ─────────────────────────────────────────────────────────────────────────────
const SendSchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(4000, 'Message too long (max 4000 characters)')
    .transform((s) => s.trim()),
  is_action: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  // Role check — only students and supervisors can message
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['student', 'supervisor'].includes(profile.role)) {
    return NextResponse.json(
      { ok: false, error: 'Only students and supervisors can send messages' },
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

  const parsed = SendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  const { project_id, content, is_action } = parsed.data;

  // Students cannot pin action items
  if (is_action && profile.role === 'student') {
    return NextResponse.json(
      { ok: false, error: 'Only supervisors can create action items' },
      { status: 403 }
    );
  }

  // Explicitly verify the caller is a participant in this project
  const { data: project, error: projectErr } = await supabase
    .from('projects')
    .select('id, created_by, supervisor_id')
    .eq('id', project_id)
    .single();

  if (projectErr || !project) {
    return NextResponse.json({ ok: false, error: 'Project not found' }, { status: 404 });
  }

  const isProjectStudent    = profile.role === 'student'    && project.created_by   === user.id;
  const isProjectSupervisor = profile.role === 'supervisor' && project.supervisor_id === user.id;

  if (!isProjectStudent && !isProjectSupervisor) {
    return NextResponse.json(
      { ok: false, error: 'You are not a participant in this project' },
      { status: 403 }
    );
  }

  // Use admin client for the insert — we have already verified access above.
  // This avoids RLS evaluation issues while keeping the explicit check above
  // as the real gate (same pattern used in scoring/decide and archive routes).
  const admin = createAdminClient();
  const { data: msg, error } = await admin
    .from('project_messages')
    .insert({ project_id, sender_id: user.id, content, is_action })
    .select(
      `id, content, is_action, is_read, created_at,
       sender:sender_id(id, full_name, role)`
    )
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: msg }, { status: 201 });
}
