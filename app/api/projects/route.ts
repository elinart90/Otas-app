import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ProposalCreateSchema } from '@/lib/projects/schema';
import { checkTitle } from '@/lib/similarity/title-check';
import { sendNotification } from '@/lib/notifications/send';

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB for proposals (can be a draft chapter)
const TITLE_BLOCK_THRESHOLD = 0.75;

// =========================================================================
// POST /api/projects
// Create a new project proposal. Accepts multipart/form-data with:
//   - meta: JSON-encoded ProposalCreateSchema
//   - file (optional): PDF
// =========================================================================
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  // Confirm the caller is a student (only students submit proposals)
  const { data: profile } = await supabase
    .from('users')
    .select('role, programme_id')
    .eq('id', user.id)
    .single();
  if (!profile || profile.role !== 'student') {
    return NextResponse.json(
      { ok: false, error: 'Only students may submit proposals' },
      { status: 403 }
    );
  }

  // Require caller to be the group leader
  const adminDb0 = createAdminClient();
  const { data: leaderMembership } = await adminDb0
    .from('student_group_members')
    .select('group_id, is_leader')
    .eq('user_id', user.id)
    .eq('is_leader', true)
    .maybeSingle();
  if (!leaderMembership) {
    return NextResponse.json(
      { ok: false, error: 'Only the group leader may submit the group proposal' },
      { status: 403 }
    );
  }

  // Prevent duplicate proposal for the same group
  const { data: existingGroupProject } = await adminDb0
    .from('projects')
    .select('id')
    .eq('group_id', leaderMembership.group_id)
    .maybeSingle();
  if (existingGroupProject) {
    return NextResponse.json(
      { ok: false, error: 'Your group already has a submitted proposal' },
      { status: 409 }
    );
  }

  // Parse multipart
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }

  const metaRaw = formData.get('meta');
  if (typeof metaRaw !== 'string') {
    return NextResponse.json({ ok: false, error: 'Missing proposal metadata' }, { status: 400 });
  }
  let metaJson: unknown;
  try {
    metaJson = JSON.parse(metaRaw);
  } catch {
    return NextResponse.json({ ok: false, error: 'meta is not valid JSON' }, { status: 400 });
  }

  const parsed = ProposalCreateSchema.safeParse(metaJson);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid proposal data' },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // Server-side title similarity gate. Cheap, mandatory, and saves us
  // from clients that try to bypass the live check.
  const { data: archives } = await supabase
    .from('projects')
    .select('id, title, academic_year, status')
    .neq('status', 'draft')
    .neq('created_by', user.id);
  const corpus = (archives ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    year: row.academic_year,
    isArchived: row.status === 'archived',
  }));
  const titleCheck = checkTitle(input.title, corpus, 5);
  if (titleCheck.highestScore >= TITLE_BLOCK_THRESHOLD) {
    return NextResponse.json(
      {
        ok: false,
        error: `Proposed title is too similar to an existing project (${Math.round(
          titleCheck.highestScore * 100
        )}% match). Please revise your title.`,
        similarMatch: titleCheck.matches[0]?.title,
      },
      { status: 422 }
    );
  }

  // Verify supervisor exists and has the right role
  const { data: supervisor } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', input.supervisor_id)
    .single();
  if (!supervisor || supervisor.role !== 'supervisor') {
    return NextResponse.json(
      { ok: false, error: 'Selected supervisor is invalid' },
      { status: 400 }
    );
  }

  // Optional PDF upload
  let proposalDocPath: string | null = null;
  const file = formData.get('file');
  if (file instanceof File && file.size > 0) {
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { ok: false, error: 'Proposal document must be a PDF' },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { ok: false, error: 'Proposal PDF exceeds 15 MB' },
        { status: 400 }
      );
    }
    const safeName = file.name.replace(/[^\w.\-]/g, '_').slice(0, 100);
    const path = `${user.id}/${Date.now()}-${safeName}`;
    const buf = await file.arrayBuffer();
    const { error: upErr } = await supabase.storage
      .from('project-documents')
      .upload(path, buf, { contentType: 'application/pdf', upsert: false });
    if (upErr) {
      return NextResponse.json(
        { ok: false, error: `Upload failed: ${upErr.message}` },
        { status: 500 }
      );
    }
    proposalDocPath = path;
  }

  // Insert the project row
  const { data: project, error: insertErr } = await supabase
    .from('projects')
    .insert({
      programme_id: input.programme_id,
      supervisor_id: input.supervisor_id,
      title: input.title,
      abstract: input.abstract,
      keywords: input.keywords,
      academic_year: input.academic_year,
      status: 'proposal_submitted',
      proposal_doc_url: proposalDocPath,
      created_by: user.id,
      group_id: leaderMembership.group_id,
    })
    .select('id')
    .single();

  if (insertErr || !project) {
    // Best-effort: remove uploaded file since insert failed
    if (proposalDocPath) {
      await supabase.storage.from('project-documents').remove([proposalDocPath]);
    }
    return NextResponse.json(
      { ok: false, error: `Proposal creation failed: ${insertErr?.message}` },
      { status: 500 }
    );
  }

  // Auto-add all current group members as project_members
  const { data: groupMemberRows } = await adminDb0
    .from('student_group_members')
    .select('user_id, is_leader')
    .eq('group_id', leaderMembership.group_id);

  const projectMemberRows = (groupMemberRows ?? []).map((m) => ({
    project_id: project.id,
    user_id: m.user_id,
    role_in_team: m.is_leader ? 'lead' : 'member',
  }));
  if (projectMemberRows.length > 0) {
    await adminDb0.from('project_members').insert(projectMemberRows);
  }

  // Notify the supervisor that a proposal awaits their review
  await sendNotification({
    userId: input.supervisor_id,
    type: 'proposal_submitted',
    title: 'New proposal submitted for your review',
    body: `A student has submitted a proposal titled "${input.title}". Please review it on your dashboard.`,
    link: `/supervisor/projects/${project.id}`,
    emailData: { title: input.title, projectId: project.id },
  });

  return NextResponse.json({ ok: true, projectId: project.id });
}

// =========================================================================
// GET /api/projects
// Returns the caller's relevant projects (filtered by role).
// =========================================================================
export async function GET() {
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
  if (!profile) {
    return NextResponse.json({ ok: false, error: 'Profile not found' }, { status: 403 });
  }

  let query = supabase
    .from('projects')
    .select(
      'id, title, abstract, status, academic_year, created_at, supervisor_id, created_by'
    )
    .order('created_at', { ascending: false })
    .limit(100);

  // Role-based filtering
  if (profile.role === 'student') {
    // Return all projects where the student is a member (covers group submissions)
    const { data: memberOf } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id);
    const projectIds = (memberOf ?? []).map((m) => m.project_id);
    if (projectIds.length === 0) {
      return NextResponse.json({ ok: true, projects: [] });
    }
    query = query.in('id', projectIds);
  } else if (profile.role === 'supervisor') {
    query = query.eq('supervisor_id', user.id);
  }
  // hod/admin/panel see everything (RLS still enforced at DB level)

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, projects: data ?? [] });
}
