import Link from 'next/link';
import {
  FolderOpen, ClipboardList, CalendarDays, Archive, Plus, UsersRound, Crown,
} from 'lucide-react';
import { PageHeader, StatCard, EmptyCard } from '@/components/layout/dashboard-bits';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

  const admin = createAdminClient();

  const [
    { count: totalCount },
    { count: pendingCount },
    { count: sessionsCount },
    { data: assignedGroups },
  ] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('supervisor_id', user.id),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('supervisor_id', user.id).eq('status', 'proposal_submitted'),
    supabase.from('supervisions').select('*', { count: 'exact', head: true }).eq('supervisor_id', user.id).gte('session_date', startOfMonth.toISOString()),
    admin
      .from('student_groups')
      .select(`
        id, group_number, academic_year,
        student_group_members(is_leader, users(full_name, index_number))
      `)
      .eq('supervisor_id', user.id)
      .order('academic_year', { ascending: false }),
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

      {/* Assigned groups */}
      {assignedGroups && assignedGroups.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-sm font-semibold text-foreground">
            Assigned groups ({assignedGroups.length})
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {assignedGroups.map((group) => {
              const members = (group.student_group_members as unknown as {
                is_leader: boolean;
                users: { full_name: string; index_number: string } | null;
              }[]) ?? [];
              const leader = members.find((m) => m.is_leader)?.users;
              return (
                <div
                  key={group.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-card"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                      {group.group_number}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Group {group.group_number}
                      </p>
                      <p className="text-xs text-muted-foreground">{group.academic_year}</p>
                    </div>
                  </div>
                  {leader && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Crown className="h-3.5 w-3.5 text-primary" />
                      Leader: <span className="text-foreground">{leader.full_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <UsersRound className="h-3.5 w-3.5" />
                    {members.length} member{members.length !== 1 ? 's' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!pendingCount && !sessionsCount && (!assignedGroups || assignedGroups.length === 0) && (
        <div className="mt-4">
          <EmptyCard
            title="All caught up"
            body="No pending proposals or assigned groups yet. Check back once the admin assigns you to groups."
          />
        </div>
      )}
    </>
  );
}
