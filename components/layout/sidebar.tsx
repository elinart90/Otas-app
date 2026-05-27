'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/rbac/permissions';
import { Logo } from './logo';

type NavItem = { label: string; href: string };

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  student: [
    { label: 'Dashboard', href: '/student' },
    { label: 'My project', href: '/student/project' },
    { label: 'Title check', href: '/student/similarity' },
    { label: 'Plagiarism', href: '/student/plagiarism' },
    { label: 'Supervision', href: '/student/supervision' },
    { label: 'Archive', href: '/student/archive' },
  ],
  supervisor: [
    { label: 'Dashboard', href: '/supervisor' },
    { label: 'Projects', href: '/supervisor/projects' },
    { label: 'Supervision', href: '/supervisor/supervision' },
  ],
  panel: [
    { label: 'Dashboard', href: '/panel' },
    { label: 'Assessments', href: '/panel/assessment' },
  ],
  hod: [
    { label: 'Dashboard', href: '/hod' },
    { label: 'Overview', href: '/hod/overview' },
    { label: 'Approvals', href: '/hod/approvals' },
    { label: 'Audit log', href: '/hod/audit' },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Users', href: '/admin/users' },
    { label: 'Departments', href: '/admin/departments' },
    { label: 'Archives', href: '/admin/archives' },
    { label: 'Audit log', href: '/admin/audit' },
  ],
};

const ROLE_LABEL: Record<UserRole, string> = {
  student: 'Student',
  supervisor: 'Supervisor',
  panel: 'Panel member',
  hod: 'HoD / Coordinator',
  admin: 'Administrator',
};

export function Sidebar({
  role,
  userName,
}: {
  role: UserRole;
  userName: string;
}) {
  const pathname = usePathname();
  const items = NAV_BY_ROLE[role];

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <Logo size={32} showWordmark />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {ROLE_LABEL[role]}
        </p>
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active =
              item.href === pathname ||
              (item.href !== `/${role}` && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-primary-muted text-primary font-medium'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full transition-colors',
                      active ? 'bg-primary' : 'bg-transparent'
                    )}
                    aria-hidden
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User card */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-md bg-secondary px-3 py-2">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            {userName?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {userName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {ROLE_LABEL[role]}
            </p>
          </div>
        </div>
        <form action="/api/auth/logout" method="post" className="mt-2">
          <button
            type="submit"
            className="w-full rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-secondary"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
