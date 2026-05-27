import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/layout/dashboard-bits';
import { StageBadge } from '@/components/defense/stage-badge';
import { ScoringForm } from '@/components/scoring/scoring-form';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function PanelDefenseDetail({
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
       projects:project_id(
         id, title, abstract,
         supervisor:supervisor_id(full_name),
         author:created_by(full_name, index_number)
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
    supervisor: { full_name: string } | null;
    author: { full_name: string; index_number: string | null } | null;
  } | null;

  return (
    <>
      <PageHeader
        title={project?.title ?? 'Defense session'}
        subtitle={`${scheduled.toLocaleString()} · ${defense.venue ?? '—'}`}
        action={<StageBadge stage={defense.stage} />}
      />

      <div className="space-y-5">
        {/* Project context */}
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

        {project?.abstract && (
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Abstract</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {project.abstract}
            </p>
          </section>
        )}

        {/* The scoring form */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Scoring rubric — {defense.stage}
          </h2>
          <ScoringForm defenseId={defense.id} currentUserId={user.id} />
        </section>

        <div>
          <Link
            href="/panel"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </>
  );
}
