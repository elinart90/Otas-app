'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ROLE_HOME } from '@/lib/rbac/permissions';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'At least 8 characters'),
  fullName: z.string().min(2),
  role: z.enum(['student', 'supervisor', 'panel', 'hod', 'admin']),
  departmentId: z.string().uuid().optional().nullable(),
  programmeId: z.string().uuid().optional().nullable(),
  indexNumber: z.string().optional().nullable(),
  staffId: z.string().optional().nullable(),
});

export type RegisterState = { error?: string } | undefined;

export async function registerAction(
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName'),
    role: formData.get('role'),
    departmentId: formData.get('departmentId') || null,
    programmeId: formData.get('programmeId') || null,
    indexNumber: formData.get('indexNumber') || null,
    staffId: formData.get('staffId') || null,
  };

  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const supabase = createClient();

  // Sign up - email confirmation can be disabled in Supabase settings for dev
  const { data: signUp, error: signUpError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { role: parsed.data.role, full_name: parsed.data.fullName },
    },
  });

  if (signUpError || !signUp.user) {
    return { error: signUpError?.message ?? 'Could not create account' };
  }

  // Insert into public.users via admin client (bypasses RLS for first insert)
  const admin = createAdminClient();
  const { error: profileError } = await admin.from('users').insert({
    id: signUp.user.id,
    role: parsed.data.role,
    full_name: parsed.data.fullName,
    email: parsed.data.email,
    department_id: parsed.data.departmentId || null,
    programme_id: parsed.data.programmeId || null,
    index_number: parsed.data.indexNumber || null,
    staff_id: parsed.data.staffId || null,
  });

  if (profileError) {
    return { error: 'Account created but profile failed: ' + profileError.message };
  }

  redirect(ROLE_HOME[parsed.data.role]);
}
