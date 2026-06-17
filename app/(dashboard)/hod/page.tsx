import Link from 'next/link';
import {
  FolderOpen, ClipboardList, GraduationCap, CheckCircle2,
  Archive, ScrollText, CalendarClock, ArrowRight, Clock,
} from 'lucide-react';
import { StatCard } from '@/components/layout/dashboard-bits';
import { StageBadge } from '@/components/defense/stage-badge';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function timeFromNow(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const m = Math.round(diff / 60000);
  if (m < 0) return 'Overdue';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default async function HodDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { data: profile },
    { count: activeProjects },
    { count: pendingProposals },
    { count: synopsisScheduled },
    { count: finalScheduled },
    { count: completedDefenses },
    { data: upcomingDefenses },
  ] = await Promise.all([
    supabase.from('users').select('full_name').eq('id', user.id).single(),
    supabase.from('projects').select('*', { count: 'exact', head: true })
      .in('status', ['in_supervision', 'synopsis_scheduled', 'synopsis_passed', 'final_scheduled']),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'proposal_submitted'),
    supabase.from('defense_sessions').select('*', { count: 'exact', head: true }).eq('stage', 'synopsis').eq('status', 'scheduled'),
    supabase.from('defense_sessions').select('*', { count: 'exact', head: true }).eq('stage', 'final').eq('status', 'scheduled'),
    supabase.from('defense_sessions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('defense_sessions')
      .select('id, stage, scheduled_at, venue, status, projects:project_id(title)')
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_at', { ascending: true })
      .limit(5),
  ]);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'HoD';

  type DefenseRow = { id: string; stage: string; scheduled_at: string; venue: string | null; status: string; projects: { title: string } | null };
  const defenses = (upcomingDefenses ?? []) as unknown as DefenseRow[];

  const quickLinks = [
    { label: 'Schedule a defense',    description: 'Pick a project, set date/venue, assign panel.', href: '/hod/overview/new', icon: CalendarClock, accent: 'bg-primary-muted text-primary',               border: 'hover:border-primary/30'  },
    { label: 'Proposal approvals',    description: `${pendingProposals ?? 0} proposal${pendingProposals === 1 ? '' : 's'} awaiting review.`, href: '/hod/approvals', icon: CheckCircle2, accent: pendingProposals ? 'bg-warning/15 text-warning-foreground' : 'bg-secondary text-muted-foreground', border: pendingProposals ? 'hover:border-warning/30' : 'hover:border-border' },
    { label: 'Defense overview',      description: 'All upcoming, in-progress, and completed sessions.', href: '/hod/overview',  icon: GraduationCap, accent: 'bg-info/10 text-info',           border: 'hover:border-info/30'     },
    { label: 'Archive',               description: 'Browse the institutional archive of approved works.', href: '/hod/archive',   icon: Archive,       accent: 'bg-secondary text-muted-foreground', border: 'hover:border-border'      },
    { label: 'Audit log',             description: 'Department-wide archive access event log.',           href: '/hod/audit',     icon: ScrollText,    accent: 'bg-secondary text-muted-foreground', border: 'hover:border-border'      },
  ] as const;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_18rem]">

      {/* ── Main column ── */}
      <div className="min-w-0 space-y-6">

        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Department-wide project and defense oversight.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Active projects"
            value={activeProjects ?? 0}
            hint="In supervision or beyond"
            tone="info"
            icon={FolderOpen}
            href="/hod/overview"
            linkLabel="View overview"
          />
          <StatCard
            label="Pending proposals"
            value={pendingProposals ?? 0}
            hint="Awaiting approval"
            tone={pendingProposals ? 'warning' : 'default'}
            icon={ClipboardList}
            href="/hod/approvals"
            linkLabel="Review proposals"
          />
          <StatCard
            label="Scheduled defenses"
            value={(synopsisScheduled ?? 0) + (finalScheduled ?? 0)}
            hint={`${synopsisScheduled ?? 0} synopsis · ${finalScheduled ?? 0} final`}
            tone={(synopsisScheduled || finalScheduled) ? 'warning' : 'default'}
            icon={CalendarClock}
            href="/hod/overview"
            linkLabel="View defenses"
          />
          <StatCard
            label="Completed defenses"
            value={completedDefenses ?? 0}
            hint="All-time"
            tone="success"
            icon={GraduationCap}
          />
        </div>

        {/* Feature action cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-card transition-all duration-150 hover:shadow-elevated ${link.border}`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-150 group-hover:scale-110 ${link.accent}`} aria-hidden>
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
      </div>

      {/* ── Right panel ── */}
      <aside className="hidden xl:flex xl:flex-col xl:gap-4">

        {/* Upcoming defenses */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Upcoming defenses</h2>
            <Link href="/hod/overview" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>

          {defenses.length === 0 ? (
            <p className="text-xs text-muted-foreground">No defenses currently scheduled.</p>
          ) : (
            <ul className="space-y-3">
              {defenses.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/hod/overview/${d.id}`}
                    className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-3 transition-colors duration-150 hover:border-primary/20 hover:bg-secondary"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-muted">
                      <GraduationCap className="h-3.5 w-3.5 text-primary" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">
                        {(d.projects as { title: string } | null)?.title ?? 'Untitled'}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <StageBadge stage={d.stage as 'synopsis' | 'final'} />
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(d.scheduled_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium text-warning-foreground tabular-nums">
                      {timeFromNow(d.scheduled_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pending proposals quick-action */}
        {(pendingProposals ?? 0) > 0 && (
          <section className="rounded-xl border border-warning/30 bg-warning/8 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-warning-foreground">
                <Clock className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {pendingProposals} proposal{pendingProposals === 1 ? '' : 's'} waiting
                </p>
                <p className="text-xs text-muted-foreground">Require your review</p>
              </div>
            </div>
            <Link
              href="/hod/approvals"
              className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              Review now <ArrowRight className="h-3 w-3" />
            </Link>
          </section>
        )}

        {/* Promo card */}
        <section className="rounded-xl bg-[#0e3d28] p-5 text-white shadow-card">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <GraduationCap className="h-5 w-5 text-white" aria-hidden />
          </div>
          <p className="text-sm font-semibold">Keep defenses on schedule</p>
          <p className="mt-1.5 text-xs leading-relaxed text-white/65">
            Schedule synopsis defenses early to give students maximum time to prepare for their final presentation.
          </p>
          <Link
            href="/hod/overview/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-[#0e3d28] transition-opacity hover:opacity-90"
          >
            Schedule now <ArrowRight className="h-3 w-3" />
          </Link>
        </section>
      </aside>
    </div>
  );
}
