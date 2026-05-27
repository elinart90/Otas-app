import Link from 'next/link';
import { PageHeader, StatCard, EmptyCard } from '@/components/layout/dashboard-bits';
import { DefenseCard } from '@/components/defense/defense-card';
import { createClient } from '@/lib/supabase/server';
import type { DefenseStage, DefenseStatus } from '@/lib/defense/schema';

export const dynamic = 'force-dynamic';

type DefenseRow = {
  id: string;
  stage: DefenseStage;
  scheduled_at: string;
  venue: string | null;
  status: DefenseStatus;
  projects: { title: string } | null;
};

export default async function PanelDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Pull assignments first to know which defenses to fetch
  const { data: assignments } = await supabase
    .from('panel_assignments')
    .select('defense_id')
    .eq('panelist_id', user.id);

  const defenseIds = (assignments ?? []).map((a) => a.defense_id);

  let defenses: DefenseRow[] = [];
  if (defenseIds.length > 0) {
    const { data } = await supabase
      .from('defense_sessions')
      .select(
        `id, stage, scheduled_at, venue, status,
         projects:project_id(title)`
      )
      .in('id', defenseIds)
      .order('scheduled_at', { ascending: true });
    defenses = (data ?? []) as unknown as DefenseRow[];
  }

  const upcoming = defenses.filter(
    (d) => d.status === 'scheduled' || d.status === 'in_progress'
  );
  const completed = defenses.filter((d) => d.status === 'completed');

  return (
    <>
      <PageHeader
        title="Panel member dashboard"
        subtitle="Your assigned defense sessions."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Upcoming defenses"
          value={upcoming.length}
          hint="Scheduled or in progress"
          tone={upcoming.length ? 'warning' : 'default'}
        />
        <StatCard
          label="Pending scores"
          value={0}
          hint="Not yet implemented"
        />
        <StatCard
          label="Completed"
          value={completed.length}
          hint="All-time"
          tone="success"
        />
      </div>

      <div className="mt-6">
        {defenses.length === 0 ? (
          <EmptyCard
            title="No defense sessions assigned"
            body="When the HoD adds you to a defense panel, the sessions will appear here."
          />
        ) : (
          <div className="space-y-3">
            {defenses.map((d) => (
              <DefenseCard
                key={d.id}
                defense={d}
                href={`/panel/assessment/${d.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
