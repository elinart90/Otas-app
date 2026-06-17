import Link from 'next/link';
import {
  CalendarClock, ClipboardList, CheckCircle2,
  Archive, ArrowRight, GraduationCap,
} from 'lucide-react';
import { StatCard, EmptyCard } from '@/components/layout/dashboard-bits';
import { StageBadge } from '@/components/defense/stage-badge';
import { createClient } from '@/lib/supabase/server';
import type { DefenseStage, DefenseStatus } from '@/lib/defense/schema';
import { STATUS_LABEL } from '@/lib/defense/schema';

export const dynamic = 'force-dynamic';

const STATUS_DOT: Record<DefenseStatus, string> = {
  scheduled:   'bg-warning',
  in_progress: 'bg-info',
  completed:   'bg-success',
  cancelled:   'bg-muted-foreground',
};

type DefenseRow = {
  id: string;
  stage: DefenseStage;
  scheduled_at: string;
  venue: string | null;
  status: DefenseStatus;
  projects: { title: string } | null;
};

export default async function PanelDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: assignments }] = await Promise.all([
    supabase.from('users').select('full_name').eq('id', user.id).single(),
    supabase.from('panel_assignments').select('defense_id').eq('panelist_id', user.id),
  ]);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Panelist';
  const defenseIds = (assignments ?? []).map((a) => a.defense_id);

  let defenses: DefenseRow[] = [];
  if (defenseIds.length > 0) {
    const { data } = await supabase
      .from('defense_sessions')
      .select('id, stage, scheduled_at, venue, status, projects:project_id(title)')
      .in('id', defenseIds)
      .order('scheduled_at', { ascending: true });
    defenses = (data ?? []) as unknown as DefenseRow[];
  }

  const upcoming  = defenses.filter((d) => d.status === 'scheduled' || d.status === 'in_progress');
  const completed = defenses.filter((d) => d.status === 'completed');

  // Pending scores = upcoming defenses where this panelist hasn't submitted yet
  let pendingScoresCount = 0;
  if (upcoming.length > 0) {
    const { data: submittedRows } = await supabase
      .from('defense_scores')
      .select('defense_id')
      .in('defense_id', upcoming.map((d) => d.id))
      .eq('panelist_id', user.id)
      .eq('submitted', true);
    const submitted = new Set((submittedRows ?? []).map((r) => r.defense_id));
    pendingScoresCount = upcoming.filter((d) => !submitted.has(d.id)).length;
  }

  const quickLinks = [
    {
      icon: ClipboardList,
      label: 'My assessments',
      description: 'View all defense sessions you have been assigned to score.',
      href: '/panel/assessment',
      accent: 'bg-primary-muted text-primary',
      border: 'hover:border-primary/30',
    },
    {
      icon: Archive,
      label: 'Browse archive',
      description: 'Search and read approved project works from previous cohorts.',
      href: '/panel/archive',
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
          Your assigned defense sessions and scoring progress.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Upcoming defenses"
          value={upcoming.length}
          hint="Scheduled or in progress"
          tone={upcoming.length ? 'warning' : 'default'}
          icon={CalendarClock}
          href="/panel/assessment"
          linkLabel="View all assessments"
        />
        <StatCard
          label="Pending scores"
          value={pendingScoresCount}
          hint={pendingScoresCount ? 'Awaiting your submission' : 'All scores submitted'}
          tone={pendingScoresCount ? 'warning' : 'default'}
          icon={ClipboardList}
          href="/panel/assessment"
          linkLabel="Submit scores"
        />
        <StatCard
          label="Completed"
          value={completed.length}
          hint="All-time assessments"
          tone="success"
          icon={CheckCircle2}
        />
      </div>

      {/* Quick-action cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`group flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-card transition-all duration-150 hover:shadow-elevated ${link.border}`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-150 group-hover:scale-110 ${link.accent}`}
                aria-hidden
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{link.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{link.description}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Defense session list */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Defense sessions ({defenses.length})
          </h2>
          {defenses.length > 0 && (
            <Link href="/panel/assessment" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {defenses.length === 0 ? (
          <EmptyCard
            title="No defense sessions assigned"
            body="When the HoD adds you to a defense panel, the sessions will appear here."
          />
        ) : (
          <div className="space-y-3">
            {defenses.map((d) => {
              const scheduled = new Date(d.scheduled_at);
              const isPending = pending(d, defenses, user.id);

              return (
                <Link
                  key={d.id}
                  href={`/panel/assessment/${d.id}`}
                  className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-150 hover:border-primary/25 hover:shadow-elevated"
                >
                  {/* Status dot */}
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[d.status]}`}
                    aria-hidden
                  />

                  {/* Project title */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground transition-colors duration-150 group-hover:text-primary">
                      {(d.projects as { title: string } | null)?.title ?? 'Untitled project'}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{scheduled.toLocaleDateString()}</span>
                      {d.venue && <span>📍 {d.venue}</span>}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex shrink-0 items-center gap-2">
                    <StageBadge stage={d.stage} />
                    <span className="pill pill-muted capitalize">{STATUS_LABEL[d.status]}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// Helper — we don't have per-row score data here so this is a placeholder
function pending(_d: DefenseRow, _all: DefenseRow[], _uid: string) {
  return false;
}
