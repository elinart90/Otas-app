import Link from 'next/link';
import {
  FolderOpen, CalendarDays, GraduationCap,
  Search, ShieldCheck, Archive, Plus, ArrowRight,
} from 'lucide-react';
import { PageHeader, StatCard, EmptyCard } from '@/components/layout/dashboard-bits';
import { StatusBadge } from '@/components/projects/status-badge';
import { createClient } from '@/lib/supabase/server';
import type { ProjectStatus } from '@/lib/projects/schema';

export const dynamic = 'force-dynamic';

const STATUS_HINT: Partial<Record<ProjectStatus, string>> = {
  draft:              'Not yet submitted',
  proposal_submitted: 'Awaiting supervisor review',
  proposal_approved:  'Approved — supervision begins',
  proposal_rejected:  'Please revise and resubmit',
  in_supervision:     'Sessions in progress',
  synopsis_scheduled: 'Synopsis defense coming up',
  synopsis_passed:    'Synopsis cleared — well done!',
  synopsis_failed:    'Synopsis needs to be retaken',
  final_scheduled:    'Final defense coming up',
  final_passed:       'Final cleared — congratulations!',
  final_failed:       'Final defense needs to be retaken',
};

const STATUS_TONE: Partial<Record<ProjectStatus, 'default' | 'success' | 'warning' | 'info' | 'destructive'>> = {
  draft:              'default',
  proposal_submitted: 'info',
  proposal_approved:  'success',
  proposal_rejected:  'destructive',
  in_supervision:     'info',
  synopsis_scheduled: 'warning',
  synopsis_passed:    'success',
  synopsis_failed:    'destructive',
  final_scheduled:    'warning',
  final_passed:       'success',
  final_failed:       'destructive',
  archived:           'default',
};

function statusLabel(s: ProjectStatus): string {
  const map: Partial<Record<ProjectStatus, string>> = {
    draft:              'Draft',
    proposal_submitted: 'Awaiting review',
    proposal_approved:  'Approved',
    proposal_rejected:  'Rejected',
    in_supervision:     'In supervision',
    synopsis_scheduled: 'Synopsis',
    synopsis_passed:    'Synopsis ✓',
    synopsis_failed:    'Synopsis ✗',
    final_scheduled:    'Final',
    final_passed:       'Final ✓',
    final_failed:       'Final ✗',
    archived:           'Archived ✓',
  };
  return map[s] ?? s;
}

export default async function StudentDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: project }] = await Promise.all([
    supabase.from('users').select('full_name').eq('id', user.id).single(),
    supabase
      .from('projects')
      .select('id, title, status')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Student';

  let sessionsCount = 0;
  let latestDefense: {
    stage: string; status: string;
    hod_decision: string | null; scheduled_at: string;
  } | null = null;

  if (project) {
    const [{ count }, { data: def }] = await Promise.all([
      supabase
        .from('supervisions')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project.id),
      supabase
        .from('defense_sessions')
        .select('stage, status, hod_decision, scheduled_at')
        .eq('project_id', project.id)
        .order('scheduled_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    sessionsCount = count ?? 0;
    latestDefense = def;
  }

  let defenseStageLabel = '—';
  let defenseStageHint = 'Not scheduled';
  let defenseStageTone: 'default' | 'success' | 'warning' | 'info' | 'destructive' = 'default';
  if (latestDefense) {
    const sl = latestDefense.stage === 'synopsis' ? 'Synopsis' : 'Final';
    if (latestDefense.status === 'completed' && latestDefense.hod_decision === 'passed') {
      defenseStageLabel = `${sl} ✓`; defenseStageHint = 'Passed'; defenseStageTone = 'success';
    } else if (latestDefense.status === 'completed' && latestDefense.hod_decision === 'failed') {
      defenseStageLabel = `${sl} ✗`; defenseStageHint = 'Failed'; defenseStageTone = 'destructive';
    } else if (latestDefense.status === 'scheduled') {
      defenseStageLabel = sl;
      defenseStageHint = new Date(latestDefense.scheduled_at).toLocaleDateString();
      defenseStageTone = 'warning';
    } else {
      defenseStageLabel = sl; defenseStageHint = latestDefense.status; defenseStageTone = 'info';
    }
  }

  const status = (project?.status ?? 'draft') as ProjectStatus;

  const quickLinks = [
    {
      icon: Search,
      label: 'Title similarity check',
      description: 'Validate your proposed project title against the archive before submitting.',
      href: '/student/similarity',
      accent: 'bg-info/10 text-info',
      border: 'hover:border-info/30',
    },
    {
      icon: ShieldCheck,
      label: 'Plagiarism screening',
      description: 'Upload your document for text similarity detection against past projects.',
      href: '/student/plagiarism',
      accent: 'bg-warning/15 text-warning-foreground',
      border: 'hover:border-warning/30',
    },
    {
      icon: CalendarDays,
      label: 'Supervision sessions',
      description: 'View all your recorded supervision sessions, notes, and next steps.',
      href: '/student/supervision',
      accent: 'bg-success/10 text-success',
      border: 'hover:border-success/30',
    },
    {
      icon: Archive,
      label: 'Browse archive',
      description: 'Search and read approved project works from previous cohorts.',
      href: '/student/archive',
      accent: 'bg-secondary text-muted-foreground',
      border: 'hover:border-border',
    },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here's your project progress at a glance.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Project status"
          value={project ? statusLabel(status) : 'No project'}
          hint={STATUS_HINT[status] ?? '—'}
          tone={STATUS_TONE[status] ?? 'default'}
          icon={FolderOpen}
          href={project ? `/student/project/${project.id}` : '/student/project/new'}
          linkLabel={project ? 'View my project' : 'Start a proposal'}
        />
        <StatCard
          label="Supervision sessions"
          value={sessionsCount}
          hint="Logged so far"
          tone={sessionsCount > 0 ? 'success' : 'info'}
          icon={CalendarDays}
          href="/student/supervision"
          linkLabel="View sessions"
        />
        <StatCard
          label="Defense stage"
          value={defenseStageLabel}
          hint={defenseStageHint}
          tone={defenseStageTone}
          icon={GraduationCap}
        />
      </div>

      {/* Current project card */}
      {project ? (
        <Link
          href={`/student/project/${project.id}`}
          className="group flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-6 shadow-card transition-all duration-150 hover:border-primary/30 hover:shadow-elevated"
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Current project
            </p>
            <p className="mt-2 text-lg font-bold text-foreground transition-colors duration-150 group-hover:text-primary">
              {project.title}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              Click to view full details
              <ArrowRight className="h-3 w-3" />
            </p>
          </div>
          <StatusBadge status={status} />
        </Link>
      ) : (
        <EmptyCard
          title="No project proposal yet"
          body="Use the Title check page to validate your idea, then submit a proposal for supervisor approval."
          action={
            <Link
              href="/student/project/new"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors duration-150 hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Start a proposal
            </Link>
          }
        />
      )}

      {/* Quick-action feature cards */}
      <div>
        <p className="mb-3 text-sm font-semibold text-foreground">Quick actions</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-card transition-all duration-150 hover:shadow-elevated ${link.border}`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${link.accent}`}
                  aria-hidden
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{link.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {link.description}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  Open <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
