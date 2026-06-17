import Link from 'next/link';
import {
  FolderOpen, ClipboardList, CalendarDays, Archive, Plus,
} from 'lucide-react';
import { PageHeader, StatCard, EmptyCard } from '@/components/layout/dashboard-bits';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function SupervisorDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [{ count: totalCount }, { count: pendingCount }, { count: sessionsCount }] =
    await Promise.all([
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('supervisor_id', user.id),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('supervisor_id', user.id).eq('status', 'proposal_submitted'),
      supabase.from('supervisions').select('*', { count: 'exact', head: true }).eq('supervisor_id', user.id).gte('session_date', startOfMonth.toISOString()),
    ]);

  const quickLinks = [
    ...(pendingCount
      ? [{
          label: `${pendingCount} proposal${pendingCount === 1 ? '' : 's'} awaiting review`,
          description: 'Approve or reject pending project proposals.',
          href: '/supervisor/projects',
          icon: ClipboardList,
          accent: 'bg-warning/15 text-warning-foreground',
          border: 'hover:border-warning/30',
        }]
      : []),
    {
      label: 'Log a supervision session',
      description: 'Record what was discussed, notes, and next steps.',
      href: '/supervisor/supervision/new',
      icon: Plus,
      accent: 'bg-primary-muted text-primary',
      border: 'hover:border-primary/30',
    },
    {
      label: 'Browse archive',
      description: 'View approved and archived project works.',
      href: '/supervisor/archive',
      icon: Archive,
      accent: 'bg-secondary text-muted-foreground',
      border: 'hover:border-border',
    },
  ] as const;

  return (
    <>
      <PageHeader
        title="Supervisor dashboard"
        subtitle="Projects assigned to you and supervision activity."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Projects"
          value={totalCount ?? 0}
          hint="Currently assigned"
          tone="info"
          icon={FolderOpen}
        />
        <StatCard
          label="Pending approvals"
          value={pendingCount ?? 0}
          hint="Awaiting your decision"
          tone={pendingCount ? 'warning' : 'default'}
          icon={ClipboardList}
        />
        <StatCard
          label="Sessions this month"
          value={sessionsCount ?? 0}
          hint="Across all your projects"
          tone={sessionsCount ? 'success' : 'default'}
          icon={CalendarDays}
        />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`group flex items-start gap-4 rounded-lg border border-border bg-card p-5 shadow-card transition-all duration-150 hover:shadow-elevated ${link.border}`}
            >
              <span
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-transform duration-150 group-hover:scale-110 ${link.accent}`}
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

      {!pendingCount && !sessionsCount && (
        <div className="mt-4">
          <EmptyCard
            title="All caught up"
            body="No pending proposals. Once supervision sessions begin, they'll appear here."
          />
        </div>
      )}
    </>
  );
}
