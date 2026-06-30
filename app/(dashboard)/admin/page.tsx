import Link from 'next/link';
import {
  Users, FolderOpen, Archive, Clock,
  Building2, ScrollText, ArrowRight,
  UserPlus, Plus, Upload, Search, UsersRound,
} from 'lucide-react';
import { StatCard } from '@/components/layout/dashboard-bits';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// ── Decorative mini-bar chart (replaces sparkline) ───────────
function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex h-8 items-end gap-px">
      {[40, 55, 45, 70, 60, 80, pct].map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm opacity-70"
          style={{ height: `${h}%`, backgroundColor: color }}
        />
      ))}
    </div>
  );
}

// ── Time-ago helper ───────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default async function AdminDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // ── Current period counts ─────────────────────────────────
  const [
    { count: userCount },
    { count: deptCount },
    { count: progCount },
    { count: archiveCount },
    { count: projectCount },
    { count: pendingArchiveCount },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('departments').select('*', { count: 'exact', head: true }),
    supabase.from('programmes').select('*', { count: 'exact', head: true }),
    supabase.from('archives').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'final_passed'),
  ]);

  // ── Recent-activity feed (last 5 events) ─────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: recentUsers }, { data: recentArchives }] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name, role, created_at')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(4),
    supabase
      .from('archives')
      .select('id, archive_code, created_at, project:project_id(title)')
      .order('created_at', { ascending: false })
      .limit(4),
  ]);

  type Activity = {
    id: string;
    label: string;
    sub: string;
    time: string;
    kind: 'user' | 'archive';
  };

  const activities: Activity[] = [
    ...(recentUsers ?? []).map((u) => ({
      id: `u-${u.id}`,
      label: 'User registered',
      sub: u.full_name ?? u.role,
      time: u.created_at,
      kind: 'user' as const,
    })),
    ...(recentArchives ?? []).map((a) => ({
      id: `a-${a.id}`,
      label: 'Project archived',
      sub: (a.project as { title?: string } | null)?.title ?? a.archive_code,
      time: a.created_at,
      kind: 'archive' as const,
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 5);

  // ── Feature cards ─────────────────────────────────────────
  const featureCards = [
    {
      icon: Users,
      title: 'Manage users',
      description: 'View and manage all registered accounts by role.',
      href: '/admin/users',
      cta: 'Go to users',
      accent: 'bg-info/10 text-info',
      illustration: <UsersIllustration />,
    },
    {
      icon: Building2,
      title: 'Departments & programmes',
      description: 'Review and manage configured departments and programme listings.',
      href: '/admin/departments',
      cta: 'Manage listings',
      accent: 'bg-primary-muted text-primary',
      illustration: <BuildingIllustration />,
    },
    {
      icon: Archive,
      title: 'Archive management',
      description: 'Oversee projects awaiting upload to the digital archive.',
      href: '/admin/archives',
      cta: 'View archive queue',
      accent: 'bg-warning/15 text-warning-foreground',
      illustration: <ArchiveIllustration />,
    },
    {
      icon: Search,
      title: 'Audit log',
      description: 'Track who has accessed archived documents system-wide.',
      href: '/admin/audit',
      cta: 'View audit log',
      accent: 'bg-secondary text-muted-foreground',
      illustration: <AuditIllustration />,
    },
  ] as const;

  const quickActions = [
    { label: 'Add new user',        href: '/admin/users',       icon: UserPlus   },
    { label: 'Manage groups',       href: '/admin/groups',      icon: UsersRound },
    { label: 'Create department',   href: '/admin/departments', icon: Building2  },
    { label: 'Upload to archive',   href: '/admin/archives',    icon: Upload     },
  ] as const;

  const systemStats = [
    {
      label: 'Total Users',
      value: userCount ?? 0,
      color: 'hsl(var(--info))',
      href: '/admin/users',
    },
    {
      label: 'Total Projects',
      value: projectCount ?? 0,
      color: 'hsl(var(--primary))',
      href: '/admin/archives',
    },
    {
      label: 'Archived Projects',
      value: archiveCount ?? 0,
      color: 'hsl(var(--warning))',
      href: '/admin/archives',
    },
    {
      label: 'Awaiting Archive',
      value: pendingArchiveCount ?? 0,
      color: 'hsl(var(--destructive))',
      href: '/admin/archives',
    },
  ] as const;

  const firstName = (user as { user_metadata?: { full_name?: string } })
    ?.user_metadata?.full_name?.split(' ')[0]
    ?? recentUsers?.find((u) => u.role === 'admin')?.full_name?.split(' ')[0]
    ?? 'Admin';

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_18rem]">

      {/* ══════════════════════════════════════════════════════
          MAIN COLUMN
      ══════════════════════════════════════════════════════ */}
      <div className="min-w-0 space-y-6">

        {/* Welcome header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's what's happening with OTAS today.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Users"
            value={userCount ?? 0}
            hint="All roles"
            tone="success"
            icon={Users}
            href="/admin/users"
            linkLabel="View all users"
          />
          <StatCard
            label="Projects"
            value={projectCount ?? 0}
            hint="All statuses"
            tone="info"
            icon={FolderOpen}
            href="/admin/archives"
            linkLabel="View all projects"
          />
          <StatCard
            label="Archived"
            value={archiveCount ?? 0}
            hint="In the digital archive"
            tone="warning"
            icon={Archive}
            href="/admin/archives"
            linkLabel="View archive"
          />
          <StatCard
            label="Awaiting archive"
            value={pendingArchiveCount ?? 0}
            hint="Passed final defense"
            tone={pendingArchiveCount ? 'warning' : 'default'}
            icon={Clock}
            href="/admin/archives"
            linkLabel="View pending"
          />
        </div>

        {/* Departments / programmes strip */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4" aria-hidden />
              <strong className="font-semibold text-foreground">{deptCount ?? 0}</strong>
              {' '}Departments
            </span>
            <span className="h-4 w-px bg-border" />
            <span className="flex items-center gap-1.5">
              <ScrollText className="h-4 w-4" aria-hidden />
              <strong className="font-semibold text-foreground">{progCount ?? 0}</strong>
              {' '}Programmes
            </span>
          </div>
          <Link
            href="/admin/departments"
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View all departments &amp; programmes
            <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>

        {/* Feature cards — 2 × 2 */}
        <div className="grid gap-4 sm:grid-cols-2">
          {featureCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.href + card.title}
                className="relative flex items-center justify-between overflow-hidden rounded-xl border border-border bg-card p-6 shadow-card"
              >
                {/* Left: icon + text + button */}
                <div className="z-10 flex flex-col gap-3">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.accent}`}
                    aria-hidden
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">{card.title}</p>
                    <p className="mt-0.5 max-w-[16ch] text-xs leading-relaxed text-muted-foreground">
                      {card.description}
                    </p>
                  </div>
                  <Link
                    href={card.href}
                    className="flex w-fit items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-colors duration-150 hover:bg-primary/90"
                  >
                    {card.cta}
                    <ArrowRight className="h-3 w-3" aria-hidden />
                  </Link>
                </div>

                {/* Right: decorative illustration */}
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 opacity-30">
                  {card.illustration}
                </div>
              </div>
            );
          })}
        </div>

        {/* System overview */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">System overview</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              A quick look at system activities and archive status.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {systemStats.map((s) => {
              const pct = projectCount
                ? Math.round(((s.value as number) / Math.max(projectCount, 1)) * 100)
                : 0;
              return (
                <Link key={s.label} href={s.href} className="group space-y-2">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold tabular-nums text-foreground">
                    {s.value}
                  </p>
                  <MiniBar pct={pct} color={s.color} />
                </Link>
              );
            })}
          </div>

          {/* Projects-by-status breakdown */}
          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Projects by status
            </p>
            <div className="space-y-2">
              {[
                { label: 'Archived',         value: archiveCount ?? 0,        color: 'bg-warning'     },
                { label: 'Awaiting archive', value: pendingArchiveCount ?? 0, color: 'bg-destructive' },
                { label: 'Other',            value: Math.max(0, (projectCount ?? 0) - (archiveCount ?? 0) - (pendingArchiveCount ?? 0)), color: 'bg-muted-foreground' },
              ].map((row) => {
                const pct = projectCount
                  ? Math.round((row.value / Math.max(projectCount, 1)) * 100)
                  : 0;
                return (
                  <div key={row.label} className="flex items-center gap-3 text-xs">
                    <span className="w-32 shrink-0 text-muted-foreground">{row.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full ${row.color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right tabular-nums text-muted-foreground">
                      {row.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* ══════════════════════════════════════════════════════
          RIGHT PANEL
      ══════════════════════════════════════════════════════ */}
      <aside className="hidden xl:flex xl:flex-col xl:gap-4">

        {/* Quick actions */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Quick actions</h2>
          <ul className="space-y-1">
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <li key={a.label}>
                  <Link
                    href={a.href}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    {a.label}
                    <ArrowRight className="ml-auto h-3.5 w-3.5 opacity-40" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Recent activity */}
        <section className="flex-1 rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Recent activity</h2>
            <Link
              href="/admin/audit"
              className="text-xs font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>

          {activities.length === 0 ? (
            <p className="text-xs text-muted-foreground">No recent activity.</p>
          ) : (
            <ul className="space-y-3">
              {activities.map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  {/* Coloured avatar dot */}
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      a.kind === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-warning/20 text-warning-foreground'
                    }`}
                  >
                    {a.kind === 'user' ? (
                      <Users className="h-3.5 w-3.5" />
                    ) : (
                      <Archive className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground">{a.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.sub}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                    {timeAgo(a.time)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Promo / tip card */}
        <section className="rounded-xl bg-[#0e3d28] p-5 text-white shadow-card">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <Archive className="h-5 w-5 text-white" aria-hidden />
          </div>
          <p className="text-sm font-semibold">
            Keep your archive organized and secure
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-white/65">
            Ensure all completed projects are uploaded and archived on time to
            maintain institutional records.
          </p>
          <Link
            href="/admin/archives"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-[#0e3d28] transition-opacity hover:opacity-90"
          >
            Learn more
            <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        </section>
      </aside>
    </div>
  );
}

// ─── Decorative SVG illustrations ────────────────────────────

function UsersIllustration() {
  return (
    <svg width="100" height="80" viewBox="0 0 100 80" fill="none" aria-hidden>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${i * 28}, 10)`}>
          <circle cx="18" cy="16" r="12" fill="currentColor" opacity={0.6 - i * 0.1} />
          <rect x="4" y="32" width="28" height="20" rx="6" fill="currentColor" opacity={0.5 - i * 0.1} />
        </g>
      ))}
    </svg>
  );
}

function BuildingIllustration() {
  return (
    <svg width="90" height="80" viewBox="0 0 90 80" fill="none" aria-hidden>
      <rect x="10" y="20" width="70" height="55" rx="3" fill="currentColor" opacity="0.4" />
      <rect x="20" y="8"  width="50" height="15" rx="2" fill="currentColor" opacity="0.6" />
      {[0, 1, 2].map((col) =>
        [0, 1, 2].map((row) => (
          <rect
            key={`${col}-${row}`}
            x={20 + col * 20}
            y={30 + row * 14}
            width="12"
            height="10"
            rx="2"
            fill="white"
            opacity="0.5"
          />
        ))
      )}
    </svg>
  );
}

function ArchiveIllustration() {
  return (
    <svg width="90" height="80" viewBox="0 0 90 80" fill="none" aria-hidden>
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={8 + i * 6}
          y={10 + i * 8}
          width="62"
          height="44"
          rx="4"
          fill="currentColor"
          opacity={0.55 - i * 0.12}
        />
      ))}
      <circle cx="72" cy="64" r="14" fill="currentColor" opacity="0.7" />
      <circle cx="72" cy="64" r="8"  fill="white"       opacity="0.5" />
      <line x1="79" y1="71" x2="86" y2="78" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

function AuditIllustration() {
  return (
    <svg width="90" height="80" viewBox="0 0 90 80" fill="none" aria-hidden>
      <rect x="10" y="8"  width="55" height="64" rx="5" fill="currentColor" opacity="0.35" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x="20" y={20 + i * 12} width="35" height="6" rx="2" fill="currentColor" opacity="0.55" />
      ))}
      <circle cx="70" cy="58" r="16" fill="currentColor" opacity="0.65" />
      <circle cx="70" cy="58" r="9"  fill="white"       opacity="0.45" />
      <line x1="80" y1="68" x2="88" y2="76" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity="0.65" />
    </svg>
  );
}
