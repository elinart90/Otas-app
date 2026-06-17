import { PageHeader, EmptyCard } from '@/components/layout/dashboard-bits';
import { SessionCard } from '@/components/supervision/session-card';
import { createClient } from '@/lib/supabase/server';
import type { SupervisionOutcome } from '@/lib/supervision/schema';

export const dynamic = 'force-dynamic';

export default async function StudentSupervisionPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch projects the student is a member of, then fetch sessions for those projects.
  // RLS already restricts what they can see, but we're explicit here for clarity.
  const { data: memberships } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', user.id);

  const projectIds = (memberships ?? []).map((m) => m.project_id);

  let sessions: Array<{
    id: string;
    session_date: string;
    agenda: string;
    notes: string | null;
    outcome: SupervisionOutcome;
    next_steps: string | null;
    projects: { title: string } | null;
    supervisor: { full_name: string } | null;
    attachments: Array<{ id: string; file_name: string }>;
  }> = [];

  if (projectIds.length > 0) {
    const { data } = await supabase
      .from('supervisions')
      .select(
        `id, session_date, agenda, notes, outcome, next_steps,
         projects:project_id(title),
         supervisor:supervisor_id(full_name),
         attachments:supervision_attachments(id, file_name)`
      )
      .in('project_id', projectIds)
      .order('session_date', { ascending: false });
    sessions = (data ?? []) as unknown as typeof sessions;
  }

  return (
    <>
      <PageHeader
        title="Supervision timeline"
        subtitle="A record of every supervision session logged by your supervisor."
      />

      {sessions.length === 0 ? (
        <EmptyCard
          title="No sessions yet"
          body="Once your proposal is approved and supervision begins, sessions logged by your supervisor will appear here."
        />
      ) : (
        <div className="space-y-4">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </div>
      )}
    </>
  );
}
