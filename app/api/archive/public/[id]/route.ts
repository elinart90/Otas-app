import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// =========================================================================
// GET /api/archive/public/[id] — unauthenticated archive detail
// Returns project metadata + abstract + keywords + members.
// NO signed PDF URL — callers must log in to view the full document.
// =========================================================================
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = createAdminClient();

  const { data: project, error } = await admin
    .from('projects')
    .select(
      `id, title, abstract, keywords, academic_year, status, group_id,
       programme:programme_id(name, code),
       author:created_by(full_name, index_number),
       supervisor:supervisor_id(full_name),
       members:project_members(role_in_team, user:user_id(full_name, index_number)),
       archives:archives(id, archive_code, year)`
    )
    .eq('id', params.id)
    .eq('status', 'archived')
    .eq('is_seed', false)
    .single();

  if (error || !project) {
    return NextResponse.json(
      { ok: false, error: 'Archive not found' },
      { status: 404 }
    );
  }

  const archiveRaw = project.archives as
    | { id: string; archive_code: string; year: number }
    | { id: string; archive_code: string; year: number }[]
    | null;
  const archive = Array.isArray(archiveRaw) ? archiveRaw[0] ?? null : archiveRaw;

  return NextResponse.json({
    ok: true,
    project,
    archive,
    hasDocument: false, // public route never exposes signed URLs
    requiresLogin: true,
  });
}
