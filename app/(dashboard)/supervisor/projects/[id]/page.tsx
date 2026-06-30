import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/layout/dashboard-bits';
import { StatusBadge } from '@/components/projects/status-badge';
import { DecisionForm } from '@/components/projects/decision-form';
import { SupervisorArchiveUpload } from '@/components/archive/supervisor-upload-form';
import { ProjectChat } from '@/components/messaging/project-chat';
import { createClient } from '@/lib/supabase/server';
import type { ProjectStatus } from '@/lib/projects/schema';

export const dynamic = 'force-dynamic';

export default async function SupervisorProjectDetail({
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
       created_at, proposal_doc_url, supervisor_id, group_id,
       author:created_by(full_name, email, index_number)`
    )
    .eq('id', params.id)
    .single();

  if (!project) notFound();
  // Defence-in-depth: ensure caller is the supervisor for this project
  if (project.supervisor_id !== user.id) notFound();

  // Sign the proposal doc URL if present
  let docUrl: string | null = null;
  if (project.proposal_doc_url) {
    const { data: signed } = await supabase.storage
      .from('project-documents')
      .createSignedUrl(project.proposal_doc_url, 60 * 15);
    docUrl = signed?.signedUrl ?? null;
  }

  // Check if an archive already exists for this project (Phase 3.1)
  const { data: existingArchive } = await supabase
    .from('archives')
    .select('id, archive_code')
    .eq('project_id', project.id)
    .maybeSingle();

  const status = project.status as ProjectStatus;
  const author = project.author as unknown as {
    full_name: string;
    email: string;
    index_number: string | null;
  } | null;

  return (
    <>
      <PageHeader
        title={project.title}
        subtitle={`Submitted ${new Date(project.created_at).toLocaleDateString()} · Academic year ${project.academic_year}`}
        action={<StatusBadge status={status} />}
      />

      <div className="space-y-5">
        {/* Archive upload card - shown only when ready to archive */}
        {status === 'final_passed' && !existingArchive && (
          <SupervisorArchiveUpload
            projectId={project.id}
            academicYear={project.academic_year}
          />
        )}

        {/* Archived confirmation banner */}
        {status === 'archived' && existingArchive && (
          <div className="rounded-lg border border-success/30 bg-success/10 p-5">
            <p className="text-sm font-semibold text-foreground">
              In the institutional archive
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Archived as <strong>{existingArchive.archive_code}</strong>.
              Browseable through the Archive page.
            </p>
          </div>
        )}

        {/* Author */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Submitted by</h2>
          {author ? (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                {author.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {author.full_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {author.email}
                  {author.index_number ? ` · ${author.index_number}` : ''}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Unknown author</p>
          )}
        </section>

        {/* Abstract */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Abstract</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {project.abstract}
          </p>
        </section>

        {/* Keywords */}
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

        {/* Proposal doc */}
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

        {/* Decision form - only shown for pending proposals */}
        {status === 'proposal_submitted' && (
          <DecisionForm projectId={project.id} />
        )}

        {/* ── Group / Project chat ── */}
        <ProjectChat
          groupId={(project.group_id as string | null) ?? undefined}
          projectId={(project.group_id as string | null) ? undefined : project.id}
          currentUserId={user.id}
          isSupervisor={true}
        />

        <div>
          <Link
            href="/supervisor/projects"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Back to projects
          </Link>
        </div>
      </div>
    </>
  );
}