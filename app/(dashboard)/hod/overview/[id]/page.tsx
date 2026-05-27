import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/layout/dashboard-bits';
import { StageBadge } from '@/components/defense/stage-badge';
import { AggregateView } from '@/components/scoring/aggregate-view';
import { ScoringDecisionForm } from '@/components/scoring/decision-form';
import { createClient } from '@/lib/supabase/server';
import type { DefenseStatus } from '@/lib/defense/schema';
import { STATUS_LABEL } from '@/lib/defense/schema';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<DefenseStatus, string> = {
  scheduled: 'pill pill-warning',
  in_progress: 'pill pill-info',
  completed: 'pill pill-success',
  cancelled: 'pill pill-muted',
};

export default async function HodDefenseDetail({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: defense } = await supabase
    .from('defense_sessions')
    .select(
      `id, stage, scheduled_at, venue, status,
       hod_decision, decision_notes, decided_at,
       projects:project_id(
         id, title, abstract, status,
         supervisor:supervisor_id(full_name),
         author:created_by(full_name, index_number)
       ),
       panel:panel_assignments(
         panelist_id,
         users:panelist_id(id, full_name, email, role)
       )`
    )
    .eq('id', params.id)
    .single();

  if (!defense) notFound();

  const scheduled = new Date(defense.scheduled_at);
  const project = defense.projects as unknown as {
    id: string;
    title: string;
    abstract: string | null;
    status: string;
    supervisor: { full_name: string } | null;
    author: { full_name: string; index_number: string | null } | null;
  } | null;
  const panel = (defense.panel ?? []) as Array<{
    panelist_id: string;
    users: { id: string; full_name: string; email: string; role: string } | null;
  }>;

  // Build panelist list for AggregateView
  const panelists = panel
    .map((p) => p.users)
    .filter((u): u is { id: string; full_name: string; email: string; role: string } => u !== null)
    .map((u) => ({ id: u.id, full_name: u.full_name }));

  const isDecided = defense.status === 'completed' && defense.hod_decision;

  return (
    <>
      <PageHeader
        title={project?.title ?? 'Defense session'}
        subtitle={`${scheduled.toLocaleString()} · ${defense.venue ?? '—'}`}
        action={
          <div className="flex items-center gap-2">
            <StageBadge stage={defense.stage} />
            <span className={STATUS_TONE[defense.status as DefenseStatus]}>
              {STATUS_LABEL[defense.status as DefenseStatus]}
            </span>
          </div>
        }
      />

      <div className="space-y-5">
        {/* Decided banner */}
        {isDecided && (
          <div
            className={
              'rounded-lg border p-5 ' +
              (defense.hod_decision === 'passed'
                ? 'border-success/30 bg-success/10'
                : 'border-destructive/30 bg-destructive/10')
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-foreground">
                  Decision: {defense.hod_decision === 'passed' ? 'Passed' : 'Failed'}
                </p>
                {defense.decided_at && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Decided {new Date(defense.decided_at).toLocaleString()}
                  </p>
                )}
                {defense.decision_notes && (
                  <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                    {defense.decision_notes}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Author + supervisor + panel */}
        <div className="grid gap-4 md:grid-cols-2">
          {project?.author && (
            <section className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground">
                Project author
              </h2>
              <p className="mt-2 text-sm text-foreground">
                {project.author.full_name}
              </p>
              {project.author.index_number && (
                <p className="text-xs text-muted-foreground">
                  {project.author.index_number}
                </p>
              )}
            </section>
          )}
          {project?.supervisor && (
            <section className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground">
                Supervisor
              </h2>
              <p className="mt-2 text-sm text-foreground">
                {project.supervisor.full_name}
              </p>
            </section>
          )}
        </div>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Panel members ({panel.length})
          </h2>
          <ul className="mt-3 space-y-2">
            {panel.map((p) => (
              <li
                key={p.panelist_id}
                className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">
                    {p.users?.full_name ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground">{p.users?.email}</p>
                </div>
                <span className="pill pill-muted">{p.users?.role}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Score aggregate */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Scores
          </h2>
          <AggregateView defenseId={defense.id} panelists={panelists} />
        </section>

        {/* Decision form (only if not yet decided) */}
        {!isDecided && defense.status !== 'cancelled' && (
          <ScoringDecisionForm defenseId={defense.id} />
        )}

        {project?.abstract && (
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Abstract</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {project.abstract}
            </p>
          </section>
        )}

        <div>
          <Link
            href="/hod/overview"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Back to overview
          </Link>
        </div>
      </div>
    </>
  );
}
