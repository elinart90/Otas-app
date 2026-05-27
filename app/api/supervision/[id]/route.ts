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

  const { data: session, error } = await supabase
    .from('supervisions')
    .select(
      `id, session_date, agenda, notes, outcome, next_steps, created_at,
       project_id, supervisor_id,
       projects:project_id(title),
       supervisor:supervisor_id(full_name),
       attachments:supervision_attachments(id, file_name, file_size_bytes, mime_type, file_url)`
    )
    .eq('id', params.id)
    .single();

  if (error || !session) {
    return NextResponse.json(
      { ok: false, error: 'Session not found or you do not have access' },
      { status: 404 }
    );
  }

  // Sign attachment URLs
  const attachments = (session.attachments ?? []) as Array<{
    id: string;
    file_name: string;
    file_size_bytes: number;
    mime_type: string;
    file_url: string;
    signedUrl?: string;
  }>;
  for (const att of attachments) {
    const { data: signed } = await supabase.storage
      .from('supervision-attachments')
      .createSignedUrl(att.file_url, 60 * 15);
    att.signedUrl = signed?.signedUrl;
  }

  return NextResponse.json({ ok: true, session });
}
