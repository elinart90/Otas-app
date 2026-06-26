'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type DeleteUserState = { error?: string; success?: boolean } | undefined;

export async function deleteUserAction(
  _prev: DeleteUserState,
  formData: FormData
): Promise<DeleteUserState> {
  const targetId = formData.get('userId') as string | null;
  if (!targetId) return { error: 'No user specified' };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Prevent self-deletion
  if (user.id === targetId) return { error: 'You cannot delete your own account' };

  // Verify caller is admin
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') return { error: 'Unauthorised' };

  // Delete from auth.users — cascades to public.users via ON DELETE CASCADE
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(targetId);
  if (error) return { error: error.message };

  revalidatePath('/admin/users');
  revalidatePath('/admin');
  return { success: true };
}
