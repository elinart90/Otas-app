import { PageHeader, StatCard, EmptyCard } from '@/components/layout/dashboard-bits';
import { createClient } from '@/lib/supabase/server';

export default async function AdminDashboard() {
  const supabase = createClient();

  const [{ count: userCount }, { count: deptCount }, { count: progCount }, { count: archiveCount }] =
    await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('departments').select('*', { count: 'exact', head: true }),
      supabase.from('programmes').select('*', { count: 'exact', head: true }),
      supabase.from('archives').select('*', { count: 'exact', head: true }),
    ]);

  return (
    <>
      <PageHeader
        title="Administrator dashboard"
        subtitle="Institutional configuration and archive management."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Users" value={userCount ?? 0} tone="success" />
        <StatCard label="Departments" value={deptCount ?? 0} tone="info" />
        <StatCard label="Programmes" value={progCount ?? 0} tone="info" />
        <StatCard label="Archived projects" value={archiveCount ?? 0} tone="warning" />
      </div>

      <div className="mt-6">
        <EmptyCard
          title="System ready"
          body="Set up departments, programmes, and rubric criteria to enable the full project lifecycle."
        />
      </div>
    </>
  );
}
