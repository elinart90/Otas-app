import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// =========================================================================
// GET /api/archive/[id]
// Returns the archived project with a short-lived signed URL to view the PDF.
// Also logs the view in archive_views for audit purposes.
// =========================================================================
export async function GET(
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

  // Fetch the project (RLS allows any authenticated user to read archived)
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select(
      `id, title, abstract, keywords, academic_year, status,
       programme:programme_id(name, code),
       author:created_by(full_name, index_number),
       supervisor:supervisor_id(full_name),
       archives:archives(id, archive_code, document_url, year)`
    )
    .eq('id', params.id)
    .eq('status', 'archived')
    .single();

  if (projErr || !project) {
    return NextResponse.json(
      { ok: false, error: 'Archive not found or you do not have access' },
      { status: 404 }
    );
  }

  // Supabase returns the joined `archives` as either an object or an array
  // depending on cardinality inference. Normalise to a single row.
  const archiveRaw = project.archives as
    | { id: string; archive_code: string; document_url: string; year: number }
    | { id: string; archive_code: string; document_url: string; year: number }[]
    | null;
  const archive = Array.isArray(archiveRaw) ? archiveRaw[0] ?? null : archiveRaw;

  let signedUrl: string | null = null;
  let hasDocument = false;

  if (archive?.document_url && !archive.document_url.startsWith('placeholder://')) {
    const { data: signed } = await supabase.storage
      .from('archives')
      .createSignedUrl(archive.document_url, 60 * 10); // 10 min
    signedUrl = signed?.signedUrl ?? null;
    hasDocument = !!signedUrl;

    // Log the view (best-effort)
    if (hasDocument) {
      const userAgent = request.headers.get('user-agent')?.slice(0, 500) ?? null;
      await supabase.from('archive_views').insert({
        user_id: user.id,
        archive_id: archive.id,
        user_agent: userAgent,
      });
    }
  }

  // Resolve the viewer's display name (used for watermark)
  const { data: viewerProfile } = await supabase
    .from('users')
    .select('full_name, email')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    ok: true,
    project,
    archive,
    signedUrl,
    hasDocument,
    viewer: {
      name: viewerProfile?.full_name ?? viewerProfile?.email ?? 'Viewer',
      email: viewerProfile?.email ?? null,
    },
  });
}