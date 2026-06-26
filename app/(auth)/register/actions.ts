'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ROLE_HOME } from '@/lib/rbac/permissions';

const INDEX_REGEX = /^[A-Z]{2,6}\.\d{2}\.\d{3}\.\d{3}\.\d{2}$/;
const ROLES_NEEDING_DEPT = new Set(['student', 'supervisor', 'hod']);

const RegisterSchema = z
  .object({
    email: z.string().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
      .regex(/[0-9]/, 'Password must include at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must include at least one special character'),
    fullName: z.string().min(3, 'Full name must be at least 3 characters'),
    role: z.enum(['student', 'supervisor', 'panel', 'hod', 'admin']),
    departmentId: z.string().uuid('Invalid department').optional().nullable(),
    programmeId: z.string().uuid('Invalid programme').optional().nullable(),
    indexNumber: z
      .string()
      .regex(INDEX_REGEX, 'Index number format: FOE.41.008.103.22')
      .optional()
      .nullable(),
    staffId: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (ROLES_NEEDING_DEPT.has(data.role) && !data.departmentId) {
      ctx.addIssue({
        code: 'custom',
        path: ['departmentId'],
        message: 'Department is required',
      });
    }
    if (data.role === 'student') {
      if (!data.indexNumber) {
        ctx.addIssue({
          code: 'custom',
          path: ['indexNumber'],
          message: 'Index number is required',
        });
      }
      if (!data.programmeId) {
        ctx.addIssue({
          code: 'custom',
          path: ['programmeId'],
          message: 'Programme is required',
        });
      }
    }
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
    return { error: 'Account created but profile setup failed: ' + profileError.message };
  }

  redirect(ROLE_HOME[parsed.data.role]);
}
