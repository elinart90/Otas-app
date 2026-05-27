import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_MIME = new Set(['application/pdf']);

export async function POST(request: NextRequest) {
  // Auth
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  // Read multipart
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid multipart body' },
      { status: 400 }
    );
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: 'No file uploaded' },
      { status: 400 }
    );
  }

  // Validate
  if (!ACCEPTED_MIME.has(file.type)) {
    return NextResponse.json(
      { ok: false, error: 'Only PDF files are accepted' },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { ok: false, error: 'File exceeds 10 MB limit' },
      { status: 400 }
    );
  }
  if (file.size < 100) {
    return NextResponse.json(
      { ok: false, error: 'File appears to be empty' },
      { status: 400 }
    );
  }

  // Upload to Storage under <user_id>/<timestamp>-<name>
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^\w.\-]/g, '_').slice(0, 100);
  const storagePath = `${user.id}/${timestamp}-${safeName}`;

  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('plagiarism-uploads')
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { ok: false, error: `Upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  // Create report row
  const { data: report, error: insertError } = await supabase
    .from('plagiarism_reports')
    .insert({
      user_id: user.id,
      document_url: storagePath, // we store the storage path, not a public URL
      document_name: file.name,
      status: 'queued',
    })
    .select('id')
    .single();

  if (insertError || !report) {
    // Best-effort cleanup
    await supabase.storage.from('plagiarism-uploads').remove([storagePath]);
    return NextResponse.json(
      { ok: false, error: `Report creation failed: ${insertError?.message}` },
      { status: 500 }
    );
  }

  // Invoke the Edge Function (fire-and-forget; client polls for status)
  // We use the admin client so we can pass the function payload server-side
  // without exposing service-role auth to the browser.
  const admin = createAdminClient();
  admin.functions
    .invoke('process-plagiarism', {
      body: { reportId: report.id },
    })
    .then((res) => {
      if (res.error) {
        console.error('[plagiarism] Edge function invoke error:', res.error);
      }
    })
    .catch((e) => console.error('[plagiarism] Edge function invoke threw:', e));

  return NextResponse.json({ ok: true, reportId: report.id });
}
