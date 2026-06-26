import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { ProfileTabs } from '@/components/profile/profile-tabs';

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('*, departments(name, code), programmes(name, code)')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account information and security</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <Suspense>
          <ProfileTabs profile={profile} />
        </Suspense>
      </div>
    </div>
  );
}
