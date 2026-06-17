import Link from 'next/link';
import { PageHeader, EmptyCard } from '@/components/layout/dashboard-bits';
import { SessionCard } from '@/components/supervision/session-card';
import { createClient } from '@/lib/supabase/server';
import type { SupervisionOutcome } from '@/lib/supervision/schema';

export const dynamic = 'force-dynamic';

export default async function SupervisorSupervisionPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: sessions } = await supabase
    .from('supervisions')
    .select(
      `id, session_date, agenda, notes, outcome, next_steps,
       project_id, projects:project_id(title),
       attachments:supervision_attachments(id, file_name)`
    )
    .eq('supervisor_id', user.id)
    .order('session_date', { ascending: false })
    .limit(100);

  const list = (sessions ?? []) as unknown as Array<{
    id: string;
    session_date: string;
    agenda: string;
    notes: string | null;
    outcome: SupervisionOutcome;
    next_steps: string | null;
    project_id: string;
    projects: { title: string } | null;
    attachments: Array<{ id: string; file_name: string }>;
  }>;

  return (
    <>
      <PageHeader
        title="Supervision sessions"
        subtitle="All sessions you have logged across your assigned projects."
        action={
          <Link
            href="/supervisor/supervision/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Log a session
          </Link>
        }
      />

      {list.length === 0 ? (
        <EmptyCard
          title="No sessions logged yet"
          body="Once a proposal you supervise is approved, you can log supervision sessions here."
          action={
            <Link
              href="/supervisor/supervision/new"
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Log your first session
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {list.map((s) => (
            <SessionCard key={s.id} session={s} showProject />
          ))}
        </div>
      )}
    </>
  );
}
