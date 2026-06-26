import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PWD_REGEX = {
  length:    /.{8,}/,
  uppercase: /[A-Z]/,
  number:    /[0-9]/,
  special:   /[^A-Za-z0-9]/,
};

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { currentPassword, newPassword, confirmPassword } = body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
  }
  if (!PWD_REGEX.length.test(newPassword)) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }
  if (!PWD_REGEX.uppercase.test(newPassword)) {
    return NextResponse.json({ error: 'Password must contain at least one uppercase letter' }, { status: 400 });
  }
  if (!PWD_REGEX.number.test(newPassword)) {
    return NextResponse.json({ error: 'Password must contain at least one number' }, { status: 400 });
  }
  if (!PWD_REGEX.special.test(newPassword)) {
    return NextResponse.json({ error: 'Password must contain at least one special character' }, { status: 400 });
  }

  // Verify current password by re-signing in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });
  if (signInError) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
