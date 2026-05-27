import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

  const { id } = params;

  // Fetch report
  const { data: report, error: reportErr } = await supabase
    .from('plagiarism_reports')
    .select(
      'id, document_name, status, overall_similarity, error_message, created_at, processed_at, user_id'
    )
    .eq('id', id)
    .single();

  if (reportErr || !report) {
    return NextResponse.json({ ok: false, error: 'Report not found' }, { status: 404 });
  }

  // Fetch matches with archive titles
  const { data: matches, error: matchErr } = await supabase
    .from('plagiarism_matches')
    .select(
      'id, similarity_score, matched_passages, matched_archive_id, projects:matched_archive_id(title, academic_year)'
    )
    .eq('report_id', id)
    .order('similarity_score', { ascending: false });

  if (matchErr) {
    return NextResponse.json({ ok: false, error: matchErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    report,
    matches: matches ?? [],
  });
}
