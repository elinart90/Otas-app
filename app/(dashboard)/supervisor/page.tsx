import Link from 'next/link';
import { PageHeader, StatCard, EmptyCard } from '@/components/layout/dashboard-bits';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function SupervisorDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [{ count: totalCount }, { count: pendingCount }, { count: sessionsCount }] =
    await Promise.all([
      supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('supervisor_id', user.id),
      supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('supervisor_id', user.id)
        .eq('status', 'proposal_submitted'),
      supabase
        .from('supervisions')
        .select('*', { count: 'exact', head: true })
        .eq('supervisor_id', user.id)
        .gte('session_date', startOfMonth.toISOString()),
    ]);

  return (
    <>
      <PageHeader
        title="Supervisor dashboard"
        subtitle="Projects assigned to you and supervision activity."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Projects"
          value={totalCount ?? 0}
          hint="Currently assigned"
          tone="info"
        />
        <StatCard
          label="Pending approvals"
          value={pendingCount ?? 0}
          hint="Awaiting your decision"
          tone={pendingCount ? 'warning' : 'default'}
        />
        <StatCard
          label="Sessions this month"
          value={sessionsCount ?? 0}
          hint="Across all your projects"
          tone={sessionsCount ? 'success' : 'default'}
        />
      </div>

      <div className="mt-6 space-y-4">
        {pendingCount ? (
          <Link
            href="/supervisor/projects"
            className="block rounded-lg border border-warning/40 bg-warning/15 p-5 transition-colors hover:bg-warning/20"
          >
            <p className="text-sm font-semibold text-foreground">
              {pendingCount} proposal{pendingCount === 1 ? '' : 's'} awaiting your review
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Click to review and approve or reject.
            </p>
          </Link>
        ) : null}

        <Link
          href="/supervisor/supervision/new"
          className="block rounded-lg border border-border bg-card p-5 transition-colors hover:bg-secondary"
        >
          <p className="text-sm font-semibold text-foreground">Log a supervision session</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Record what was discussed, notes, and next steps.
          </p>
        </Link>

        {!pendingCount && !sessionsCount && (
          <EmptyCard
            title="All caught up"
            body="No pending proposals. Once supervision sessions begin, they'll appear here."
          />
        )}
      </div>
    </>
  );
}
