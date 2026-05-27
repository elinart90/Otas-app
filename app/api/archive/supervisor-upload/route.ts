import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ArchiveUploadSchema } from '@/lib/archive/schema';

const MAX_BYTES = 30 * 1024 * 1024; // 30 MB

// =========================================================================
// POST /api/archive/supervisor-upload
//
// Supervisor uploads the final approved PDF for one of THEIR OWN students'
// projects. Tighter than the admin endpoint:
//   - caller must be a supervisor
//   - the project must have caller as supervisor_id
//   - the project status must be 'final_passed' (not yet archived, not
//     in an earlier stage)
//   - existing archive cannot be overwritten (supervisors cannot replace —
//     admin must do that)
//
// Multipart form-data:
//   - meta: JSON of ArchiveUploadSchema (project_id, archive_code)
//   - file: PDF
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
      { ok: false, error: 'Only supervisors may use this endpoint' },
      { status: 403 }
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

  // Verify the file
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

  // Verify project + ownership + status
  const { data: project } = await supabase
    .from('projects')
    .select('id, title, status, supervisor_id, academic_year')
    .eq('id', project_id)
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
  if (project.status !== 'final_passed') {
    return NextResponse.json(
      {
        ok: false,
        error: `Project is in status "${project.status}". Only projects that have passed their final defense can be archived by supervisors.`,
      },
      { status: 409 }
    );
  }

  // Refuse if an archive already exists — supervisors cannot replace.
  const { data: existingArchive } = await supabase
    .from('archives')
    .select('id')
    .eq('project_id', project_id)
    .maybeSingle();
  if (existingArchive) {
    return NextResponse.json(
      {
        ok: false,
        error: 'An archive already exists for this project. Contact the department administrator to replace it.',
      },
      { status: 409 }
    );
  }

  // Check archive_code uniqueness
  const { data: existingCode } = await supabase
    .from('archives')
    .select('id')
    .eq('archive_code', archive_code)
    .maybeSingle();
  if (existingCode) {
    return NextResponse.json(
      { ok: false, error: `Archive code "${archive_code}" is already in use` },
      { status: 409 }
    );
  }

  // Upload to storage. Use admin client to bypass any RLS edge cases —
  // the API-level checks above are the primary enforcement.
  const admin = createAdminClient();
  const storagePath = `${project.academic_year}/${archive_code}.pdf`;
  const buffer = await file.arrayBuffer();
  const { error: uploadErr } = await admin.storage
    .from('archives')
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: false, // supervisors cannot overwrite
    });
  if (uploadErr) {
    return NextResponse.json(
      { ok: false, error: `Upload failed: ${uploadErr.message}` },
      { status: 500 }
    );
  }

  // Create archives row + bump project status atomically
  const { error: archiveErr } = await admin.from('archives').insert({
    project_id,
    archive_code,
    document_url: storagePath,
    year: project.academic_year,
    uploaded_by: user.id,
  });
  if (archiveErr) {
    // Rollback the storage upload
    await admin.storage.from('archives').remove([storagePath]);
    return NextResponse.json(
      { ok: false, error: `Archive record failed: ${archiveErr.message}` },
      { status: 500 }
    );
  }

  await admin
    .from('projects')
    .update({ status: 'archived' })
    .eq('id', project_id);

  return NextResponse.json({
    ok: true,
    archive_code,
    storage_path: storagePath,
  });
}
