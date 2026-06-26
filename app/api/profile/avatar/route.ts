import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(req: NextRequest) {
  // Auth check via user session client
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('avatar') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File must be under 2 MB' }, { status: 400 });
  }

  const ext = file.name.split('.').pop() ?? 'jpg';
  const storagePath = `${user.id}/avatar.${ext}`;

  // Use admin client for storage to avoid cookie-based RLS issues in API routes
  const admin = createAdminClient();
  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await admin.storage
    .from('avatars')
    .upload(storagePath, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = admin.storage.from('avatars').getPublicUrl(storagePath);

  // Use admin client for the DB update too — session client's auth.uid() is not
  // reliably set in the RLS context of an API route, causing silent 0-row updates.
  // user.id is from the verified session above, so this is safe.
  const { error: updateError } = await admin
    .from('users')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ avatarUrl: publicUrl });
}
