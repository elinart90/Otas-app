import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/messages?group_id=<uuid>  (preferred — group-based thread)
//     /api/messages?project_id=<uuid> (legacy — per-project thread)
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  const groupId   = request.nextUrl.searchParams.get('group_id');
  const projectId = request.nextUrl.searchParams.get('project_id');

  if (!groupId && !projectId) {
    return NextResponse.json(
      { ok: false, error: 'group_id or project_id is required' },
      { status: 400 }
    );
  }

  const adminDb = createAdminClient();

  if (groupId) {
    // Verify the caller is a member or the supervisor of this group
    const [{ data: member }, { data: group }] = await Promise.all([
      adminDb.from('student_group_members').select('user_id').eq('group_id', groupId).eq('user_id', user.id).maybeSingle(),
      adminDb.from('student_groups').select('supervisor_id').eq('id', groupId).single(),
    ]);
    const isMember     = !!member;
    const isSupervisor = group?.supervisor_id === user.id;
    if (!isMember && !isSupervisor) {
      return NextResponse.json(
        { ok: false, error: 'You are not a participant in this group' },
        { status: 403 }
      );
    }

    const { data: messages, error } = await adminDb
      .from('project_messages')
      .select(`id, content, is_action, is_read, created_at,
               sender:sender_id(id, full_name, role)`)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Mark messages from others as read (fire-and-forget)
    const unreadIds = (messages ?? [])
      .filter((m) => {
        const sender = m.sender as unknown as { id: string } | null;
        return !m.is_read && sender?.id !== user.id;
      })
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      adminDb.from('project_messages').update({ is_read: true }).in('id', unreadIds).then(() => {});
    }

    return NextResponse.json({ ok: true, messages: messages ?? [] });
  }

  // Legacy: project-scoped thread
  const { data: project, error: projectErr } = await supabase
    .from('projects')
    .select('id, created_by, supervisor_id')
    .eq('id', projectId!)
    .single();
  if (projectErr || !project) {
    return NextResponse.json({ ok: false, error: 'Project not found' }, { status: 404 });
  }
  if (project.created_by !== user.id && project.supervisor_id !== user.id) {
    return NextResponse.json(
      { ok: false, error: 'You are not a participant in this project' },
      { status: 403 }
    );
  }

  const { data: messages, error } = await adminDb
    .from('project_messages')
    .select(`id, content, is_action, is_read, created_at,
             sender:sender_id(id, full_name, role)`)
    .eq('project_id', projectId!)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const unreadIds = (messages ?? [])
    .filter((m) => {
      const sender = m.sender as unknown as { id: string } | null;
      return !m.is_read && sender?.id !== user.id;
    })
    .map((m) => m.id);
  if (unreadIds.length > 0) {
    adminDb.from('project_messages').update({ is_read: true }).in('id', unreadIds).then(() => {});
  }

  return NextResponse.json({ ok: true, messages: messages ?? [] });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/messages
// Body: { group_id?, project_id?, content, is_action }
// ─────────────────────────────────────────────────────────────────────────────
const SendSchema = z.object({
  group_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(4000, 'Message too long (max 4000 characters)')
    .transform((s) => s.trim()),
  is_action: z.boolean().default(false),
}).refine((d) => d.group_id || d.project_id, {
  message: 'group_id or project_id is required',
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

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

  const { group_id, project_id, content, is_action } = parsed.data;

  if (is_action && profile.role === 'student') {
    return NextResponse.json(
      { ok: false, error: 'Only supervisors can create action items' },
      { status: 403 }
    );
  }

  const admin = createAdminClient();

  if (group_id) {
    // Verify membership or supervisor role
    const [{ data: member }, { data: group }] = await Promise.all([
      admin.from('student_group_members').select('user_id').eq('group_id', group_id).eq('user_id', user.id).maybeSingle(),
      admin.from('student_groups').select('supervisor_id').eq('id', group_id).single(),
    ]);
    if (!member && group?.supervisor_id !== user.id) {
      return NextResponse.json(
        { ok: false, error: 'You are not a participant in this group' },
        { status: 403 }
      );
    }

    const { data: msg, error } = await admin
      .from('project_messages')
      .insert({ group_id, sender_id: user.id, content, is_action })
      .select(`id, content, is_action, is_read, created_at,
               sender:sender_id(id, full_name, role)`)
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, message: msg }, { status: 201 });
  }

  // Legacy: project-scoped
  const { data: project, error: projectErr } = await supabase
    .from('projects')
    .select('id, created_by, supervisor_id')
    .eq('id', project_id!)
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

  const { data: msg, error } = await admin
    .from('project_messages')
    .insert({ project_id: project_id!, sender_id: user.id, content, is_action })
    .select(`id, content, is_action, is_read, created_at,
             sender:sender_id(id, full_name, role)`)
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, message: msg }, { status: 201 });
}
