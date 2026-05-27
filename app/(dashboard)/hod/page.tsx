import Link from 'next/link';
import { PageHeader, StatCard, EmptyCard } from '@/components/layout/dashboard-bits';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function HodDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { count: activeProjects },
    { count: synopsisScheduled },
    { count: finalScheduled },
    { count: completedDefenses },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .in('status', [
        'in_supervision',
        'synopsis_scheduled',
        'synopsis_passed',
        'final_scheduled',
      ]),
    supabase
      .from('defense_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('stage', 'synopsis')
      .eq('status', 'scheduled'),
    supabase
      .from('defense_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('stage', 'final')
      .eq('status', 'scheduled'),
    supabase
      .from('defense_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed'),
  ]);

  return (
    <>
      <PageHeader
        title="HoD dashboard"
        subtitle="Department-wide project and defense oversight."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Active projects"
          value={activeProjects ?? 0}
          hint="In supervision or beyond"
          tone="info"
        />
        <StatCard
          label="Synopsis defenses"
          value={synopsisScheduled ?? 0}
          hint="Currently scheduled"
          tone={synopsisScheduled ? 'warning' : 'default'}
        />
        <StatCard
          label="Final defenses"
          value={finalScheduled ?? 0}
          hint="Currently scheduled"
          tone={finalScheduled ? 'warning' : 'default'}
        />
        <StatCard
          label="Completed"
          value={completedDefenses ?? 0}
          hint="All-time"
          tone="success"
        />
      </div>

      <div className="mt-6 space-y-4">
        <Link
          href="/hod/overview/new"
          className="block rounded-lg border border-primary/30 bg-primary-muted p-5 transition-colors hover:bg-primary/15"
        >
          <p className="text-sm font-semibold text-primary">
            Schedule a defense
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pick a project, set date and venue, assign 2–4 panel members.
          </p>
        </Link>

        <Link
          href="/hod/overview"
          className="block rounded-lg border border-border bg-card p-5 transition-colors hover:bg-secondary"
        >
          <p className="text-sm font-semibold text-foreground">
            View all defenses
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Upcoming, in progress, and completed.
          </p>
        </Link>
      </div>
    </>
  );
}
