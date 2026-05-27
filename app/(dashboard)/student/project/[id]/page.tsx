import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/layout/dashboard-bits';
import { StatusBadge } from '@/components/projects/status-badge';
import { StageBadge } from '@/components/defense/stage-badge';
import { createClient } from '@/lib/supabase/server';
import type { ProjectStatus } from '@/lib/projects/schema';

export const dynamic = 'force-dynamic';

export default async function StudentProjectDetail({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: project } = await supabase
    .from('projects')
    .select(
      `id, title, abstract, keywords, academic_year, status,
       created_at, proposal_doc_url,
       supervisor:supervisor_id(full_name, email)`
    )
    .eq('id', params.id)
    .eq('created_by', user.id)
    .single();

  if (!project) notFound();

  // Sign proposal doc URL
  let docUrl: string | null = null;
  if (project.proposal_doc_url) {
    const { data: signed } = await supabase.storage
      .from('project-documents')
      .createSignedUrl(project.proposal_doc_url, 60 * 15);
    docUrl = signed?.signedUrl ?? null;
  }

  // Fetch defense sessions tied to this project (RLS allows project members)
  const { data: defenses } = await supabase
    .from('defense_sessions')
    .select(
      'id, stage, scheduled_at, venue, status, hod_decision, decision_notes, decided_at'
    )
    .eq('project_id', project.id)
    .order('scheduled_at', { ascending: true });

  const status = project.status as ProjectStatus;
  const supervisor = project.supervisor as unknown as {
    full_name: string;
    email: string;
  } | null;

  return (
    <>
      <PageHeader
        title={project.title}
        subtitle={`Submitted ${new Date(project.created_at).toLocaleDateString()} · Academic year ${project.academic_year}`}
        action={<StatusBadge status={status} />}
      />

      <div className="space-y-5">
        {/* Status banners */}
        {status === 'proposal_submitted' && (
          <div className="rounded-lg border border-info/30 bg-info/10 p-4 text-sm text-info-foreground">
            <strong>Awaiting supervisor review.</strong>
          </div>
        )}
        {status === 'proposal_approved' && (
          <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success-foreground">
            <strong>Proposal approved.</strong> Supervision sessions will appear on the Supervision page.
          </div>
        )}
        {status === 'proposal_rejected' && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <strong>Proposal rejected.</strong> See feedback in the abstract below.
          </div>
        )}

        {/* Defense sessions */}
        {(defenses ?? []).length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              Defense sessions
            </h2>
            <div className="space-y-3">
              {(defenses ?? []).map((d) => {
                const scheduled = new Date(d.scheduled_at);
                const isDecided = d.status === 'completed' && d.hod_decision;
                return (
                  <article
                    key={d.id}
                    className={
                      'rounded-lg border p-5 ' +
                      (isDecided && d.hod_decision === 'passed'
                        ? 'border-success/30 bg-success/10'
                        : isDecided && d.hod_decision === 'failed'
                          ? 'border-destructive/30 bg-destructive/10'
                          : 'border-border bg-card')
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {scheduled.toLocaleString()}
                        </p>
                        {d.venue && (
                          <p className="text-xs text-muted-foreground">
                            📍 {d.venue}
                          </p>
                        )}
                      </div>
                      <StageBadge stage={d.stage} />
                    </div>
                    {isDecided && (
                      <div className="mt-3 border-t border-border pt-3">
                        <p className="text-sm font-semibold text-foreground">
                          Result:{' '}
                          {d.hod_decision === 'passed' ? '✓ Passed' : '✗ Failed'}
                        </p>
                        {d.decision_notes && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {d.decision_notes}
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Abstract */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Abstract</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {project.abstract}
          </p>
        </section>

        {/* Keywords + supervisor */}
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Keywords</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(project.keywords ?? []).map((k: string) => (
                <span
                  key={k}
                  className="inline-flex items-center rounded-full bg-primary-muted px-2.5 py-1 text-xs font-medium text-primary"
                >
                  {k}
                </span>
              ))}
              {(!project.keywords || project.keywords.length === 0) && (
                <p className="text-sm text-muted-foreground">No keywords</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Supervisor</h2>
            {supervisor ? (
              <div className="mt-3">
                <p className="text-sm font-medium">{supervisor.full_name}</p>
                <p className="text-xs text-muted-foreground">{supervisor.email}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Not assigned</p>
            )}
          </section>
        </div>

        {docUrl && (
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">
              Proposal document
            </h2>
            <a
              href={docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Open proposal PDF (15-min signed link)
            </a>
          </section>
        )}

        <div>
          <Link
            href="/student/project"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Back to projects
          </Link>
        </div>
      </div>
    </>
  );
}
