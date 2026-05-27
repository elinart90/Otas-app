import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isValidRole } from '@/lib/rbac/permissions';
import { Sidebar } from '@/components/layout/sidebar';

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
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  if (!profile || !isValidRole(profile.role)) {
    redirect('/register/complete');
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={profile.role} userName={profile.full_name ?? 'User'} />
      <main className="flex-1 overflow-y-auto bg-secondary/30">
        <div className="mx-auto max-w-6xl p-6">{children}</div>
      </main>
    </div>
  );
}
