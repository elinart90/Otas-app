import Link from 'next/link';
import { PageHeader, StatCard, EmptyCard } from '@/components/layout/dashboard-bits';
import { StatusBadge } from '@/components/projects/status-badge';
import { createClient } from '@/lib/supabase/server';
import type { ProjectStatus } from '@/lib/projects/schema';

export const dynamic = 'force-dynamic';

const STATUS_HINT: Partial<Record<ProjectStatus, string>> = {
  draft: 'Not yet submitted',
  proposal_submitted: 'Awaiting supervisor',
  proposal_approved: 'Approved — start supervision',
  proposal_rejected: 'Revise and resubmit',
  in_supervision: 'Sessions in progress',
  synopsis_scheduled: 'Synopsis defense ahead',
  synopsis_passed: 'Synopsis cleared',
  synopsis_failed: 'Synopsis needs retake',
  final_scheduled: 'Final defense ahead',
  final_passed: 'Final cleared',
  final_failed: 'Final needs retake',
};

const STATUS_TONE: Partial<
  Record<ProjectStatus, 'default' | 'success' | 'warning' | 'info' | 'destructive'>
> = {
  draft: 'default',
  proposal_submitted: 'info',
  proposal_approved: 'success',
  proposal_rejected: 'destructive',
  in_supervision: 'info',
  synopsis_scheduled: 'warning',
  synopsis_passed: 'success',
  synopsis_failed: 'destructive',
  final_scheduled: 'warning',
  final_passed: 'success',
  final_failed: 'destructive',
  archived: 'default',
};

function statusLabel(s: ProjectStatus): string {
  const map: Partial<Record<ProjectStatus, string>> = {
    draft: 'Draft',
    proposal_submitted: 'Submitted',
    proposal_approved: 'Approved',
    proposal_rejected: 'Rejected',
    in_supervision: 'Active',
    synopsis_scheduled: 'Synopsis',
    synopsis_passed: 'Synopsis ✓',
    synopsis_failed: 'Synopsis ✗',
    final_scheduled: 'Final',
    final_passed: 'Final ✓',
    final_failed: 'Final ✗',
  };
  return map[s] ?? s;
}

export default async function StudentDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, status')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Supervision sessions count
  let sessionsCount = 0;
  if (project) {
    const { count } = await supabase
      .from('supervisions')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', project.id);
    sessionsCount = count ?? 0;
  }

  // Latest defense for the project — for the "Defense stage" stat
  let defenseStageLabel = '—';
  let defenseStageHint = 'Not scheduled';
  let defenseStageTone: 'default' | 'success' | 'warning' | 'info' | 'destructive' = 'default';

  if (project) {
    const { data: latestDefense } = await supabase
      .from('defense_sessions')
      .select('stage, status, hod_decision, scheduled_at')
      .eq('project_id', project.id)
      .order('scheduled_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestDefense) {
      const stageLabel = latestDefense.stage === 'synopsis' ? 'Synopsis' : 'Final';
      if (latestDefense.status === 'completed' && latestDefense.hod_decision === 'passed') {
        defenseStageLabel = `${stageLabel} ✓`;
        defenseStageHint = 'Passed';
        defenseStageTone = 'success';
      } else if (latestDefense.status === 'completed' && latestDefense.hod_decision === 'failed') {
        defenseStageLabel = `${stageLabel} ✗`;
        defenseStageHint = 'Failed';
        defenseStageTone = 'destructive';
      } else if (latestDefense.status === 'scheduled') {
        defenseStageLabel = stageLabel;
        defenseStageHint = new Date(latestDefense.scheduled_at).toLocaleDateString();
        defenseStageTone = 'warning';
      } else {
        defenseStageLabel = stageLabel;
        defenseStageHint = latestDefense.status;
        defenseStageTone = 'info';
      }
    }
  }

  const status = (project?.status ?? 'draft') as ProjectStatus;
  const hint = STATUS_HINT[status] ?? '—';

  return (
    <>
      <PageHeader
        title="Student dashboard"
        subtitle="Your project lifecycle at a glance."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Project status"
          value={project ? statusLabel(status) : 'No project'}
          hint={hint}
          tone={STATUS_TONE[status] ?? 'default'}
        />
        <StatCard
          label="Supervision sessions"
          value={sessionsCount}
          hint="Logged so far"
          tone={sessionsCount > 0 ? 'success' : 'info'}
        />
        <StatCard
          label="Defense stage"
          value={defenseStageLabel}
          hint={defenseStageHint}
          tone={defenseStageTone}
        />
      </div>

      <div className="mt-6">
        {!project ? (
          <EmptyCard
            title="Submit your project proposal"
            body="Use the Title check page to validate your idea, then submit a proposal for supervisor approval."
            action={
              <Link
                href="/student/project/new"
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Start a proposal
              </Link>
            }
          />
        ) : (
          <Link
            href={`/student/project/${project.id}`}
            className="block rounded-lg border border-border bg-card p-5 transition-colors hover:bg-secondary"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Current project
                </p>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {project.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Click to view details
                </p>
              </div>
              <StatusBadge status={status} />
            </div>
          </Link>
        )}
      </div>
    </>
  );
}
