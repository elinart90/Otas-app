import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isValidRole } from '@/lib/rbac/permissions';
import { Sidebar } from '@/components/layout/sidebar';
import { TopHeader } from '@/components/layout/top-header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('role, full_name, avatar_url')
    .eq('id', user.id)
    .single();

  if (!profile || !isValidRole(profile.role)) {
    redirect('/register/complete');
  }

  const userName = profile.full_name ?? 'User';
  const avatarUrl = profile.avatar_url ?? null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={profile.role} userName={userName} avatarUrl={avatarUrl} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopHeader role={profile.role} userName={userName} avatarUrl={avatarUrl} userId={user.id} />

        <main className="flex-1 overflow-y-auto bg-secondary/30">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
