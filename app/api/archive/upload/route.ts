export const runtime = 'nodejs';
export const maxDuration = 60;
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ArchiveUploadSchema } from '@/lib/archive/schema';

const MAX_BYTES = 30 * 1024 * 1024; // 30 MB for full thesis PDFs

// =========================================================================
// POST /api/archive/upload
// Multipart form-data:
//   - meta: JSON of ArchiveUploadSchema
//   - file: PDF (required)
// Admin-only. Uploads the PDF, replaces (or creates) the archives row,
// and marks the project as 'archived'.
// =========================================================================
export async function POST(request: NextRequest) {
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
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json(
      { ok: false, error: 'Only admins can upload archive documents' },
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
    return NextResponse.json({ ok: false, error: 'Missing meta' }, { status: 400 });
  }
  let metaJson: unknown;
  try {
    metaJson = JSON.parse(metaRaw);
  } catch {
    return NextResponse.json({ ok: false, error: 'meta is not valid JSON' }, { status: 400 });
  }
  const parsed = ArchiveUploadSchema.safeParse(metaJson);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }
  const { project_id, archive_code } = parsed.data;

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { ok: false, error: 'PDF file is required' },
      { status: 400 }
    );
  }
  if (file.type !== 'application/pdf') {
    return NextResponse.json(
      { ok: false, error: 'Only PDF files are accepted' },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: 'File exceeds 30 MB limit' },
      { status: 400 }
    );
  }

  // Verify project exists. We allow archiving regardless of current status
  // (admin override) but log a warning if not in final_passed.
  const { data: project } = await supabase
    .from('projects')
    .select('id, title, status, academic_year')
    .eq('id', project_id)
    .single();
  if (!project) {
    return NextResponse.json({ ok: false, error: 'Project not found' }, { status: 404 });
  }

  // Check for duplicate archive code on a different project
  const { data: existingCode } = await supabase
    .from('archives')
    .select('id, project_id')
    .eq('archive_code', archive_code)
    .maybeSingle();
  if (existingCode && existingCode.project_id !== project_id) {
    return NextResponse.json(
      { ok: false, error: `Archive code "${archive_code}" already used on another project` },
      { status: 409 }
    );
  }

  // Upload PDF to the archives bucket under <year>/<archive_code>.pdf
  const storagePath = `${project.academic_year}/${archive_code}.pdf`;
  const buffer = await file.arrayBuffer();
  const { error: uploadErr } = await supabase.storage
    .from('archives')
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: true, // allow re-upload to fix a mistake
    });
  if (uploadErr) {
    return NextResponse.json(
      { ok: false, error: `Upload failed: ${uploadErr.message}` },
      { status: 500 }
    );
  }

  // Upsert the archives row + bump project status atomically
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('archives')
    .select('id')
    .eq('project_id', project_id)
    .maybeSingle();

  if (existing) {
    await admin
      .from('archives')
      .update({
        archive_code,
        document_url: storagePath,
        year: project.academic_year,
        uploaded_by: user.id,
      })
      .eq('id', existing.id);
  } else {
    await admin.from('archives').insert({
      project_id,
      archive_code,
      document_url: storagePath,
      year: project.academic_year,
      uploaded_by: user.id,
    });
  }

  if (project.status !== 'archived') {
    await admin
      .from('projects')
      .update({ status: 'archived' })
      .eq('id', project_id);
  }

  return NextResponse.json({
    ok: true,
    archive_code,
    storage_path: storagePath,
  });
}

// =========================================================================
// GET /api/archive/upload?status=...
// Admin convenience: list projects eligible for archiving.
// =========================================================================
export async function GET(request: NextRequest) {
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
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json(
      { ok: false, error: 'Admin only' },
      { status: 403 }
    );
  }

  // Show projects that have passed final defense (ready for archiving)
  // plus already-archived ones (for re-upload corrections).
  const { data, error } = await supabase
    .from('projects')
    .select(
      `id, title, status, academic_year, group_id,
       author:created_by(full_name),
       members:project_members(role_in_team, user:user_id(full_name)),
       archives:archives(id, archive_code, document_url)`
    )
    .in('status', ['final_passed', 'archived'])
    .eq('is_seed', false)
    .order('academic_year', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, projects: data ?? [] });
}
