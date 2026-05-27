import Link from 'next/link';
import { PageHeader, EmptyCard } from '@/components/layout/dashboard-bits';
import { DefenseCard } from '@/components/defense/defense-card';
import { createClient } from '@/lib/supabase/server';
import type { DefenseStage, DefenseStatus } from '@/lib/defense/schema';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  stage: DefenseStage;
  scheduled_at: string;
  venue: string | null;
  status: DefenseStatus;
  projects: { title: string } | null;
  panel: Array<{
    panelist_id: string;
    users: { full_name: string } | null;
  }>;
};

export default async function HodOverviewPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('defense_sessions')
    .select(
      `id, stage, scheduled_at, venue, status,
       projects:project_id(title),
       panel:panel_assignments(panelist_id, users:panelist_id(full_name))`
    )
    .order('scheduled_at', { ascending: true });

  const list = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader
        title="Defense overview"
        subtitle="All scheduled, in-progress, and completed defenses."
        action={
          <Link
            href="/hod/overview/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Schedule a defense
          </Link>
        }
      />

      {list.length === 0 ? (
        <EmptyCard
          title="No defenses yet"
          body="Schedule a synopsis or final defense for an eligible project to get started."
          action={
            <Link
              href="/hod/overview/new"
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Schedule first defense
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {list.map((d) => (
            <DefenseCard
              key={d.id}
              defense={d}
              href={`/hod/overview/${d.id}`}
            />
          ))}
        </div>
      )}
    </>
  );
}
