import { PageHeader, EmptyCard } from '@/components/layout/dashboard-bits';
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

export default async function PanelAssessmentsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

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

  return (
    <>
      <PageHeader
        title="Assigned defenses"
        subtitle="Defense sessions where you are a panel member."
      />

      {defenses.length === 0 ? (
        <EmptyCard
          title="No assignments yet"
          body="When the HoD assigns you to a defense panel, the sessions will appear here."
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
    </>
  );
}
