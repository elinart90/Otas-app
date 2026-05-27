'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ROLE_HOME, isValidRole } from '@/lib/rbac/permissions';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginState = { error?: string } | undefined;

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: 'Enter a valid email and password (6+ characters).' };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return { error: error?.message ?? 'Invalid credentials' };
  }

  // Fetch role from public.users
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (!profile || !isValidRole(profile.role)) {
    redirect('/register/complete');
  }

  redirect(ROLE_HOME[profile.role]);
}
