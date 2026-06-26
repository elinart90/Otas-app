'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  Search,
  ShieldCheck,
  CalendarDays,
  Archive,
  ClipboardList,
  Users,
  Building2,
  ScrollText,
  GraduationCap,
  CheckCircle2,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/rbac/permissions';
import { Logo } from './logo';

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  student: [
    { label: 'Dashboard',   href: '/student',             icon: LayoutDashboard },
    { label: 'My project',  href: '/student/project',     icon: FolderOpen      },
    { label: 'Title check', href: '/student/similarity',  icon: Search          },
    { label: 'Plagiarism',  href: '/student/plagiarism',  icon: ShieldCheck     },
    { label: 'Supervision', href: '/student/supervision', icon: CalendarDays    },
    { label: 'Archive',     href: '/student/archive',     icon: Archive         },
  ],
  supervisor: [
    { label: 'Dashboard',   href: '/supervisor',             icon: LayoutDashboard },
    { label: 'Projects',    href: '/supervisor/projects',    icon: FolderOpen      },
    { label: 'Supervision', href: '/supervisor/supervision', icon: CalendarDays    },
    { label: 'Archive',     href: '/supervisor/archive',     icon: Archive         },
  ],
  panel: [
    { label: 'Dashboard',   href: '/panel',            icon: LayoutDashboard },
    { label: 'Assessments', href: '/panel/assessment', icon: ClipboardList   },
    { label: 'Archive',     href: '/panel/archive',    icon: Archive         },
  ],
  hod: [
    { label: 'Dashboard',          href: '/hod',           icon: LayoutDashboard },
    { label: 'Defense overview',   href: '/hod/overview',  icon: GraduationCap   },
    { label: 'Proposal approvals', href: '/hod/approvals', icon: CheckCircle2    },
    { label: 'Archive',            href: '/hod/archive',   icon: Archive         },
    { label: 'Audit log',          href: '/hod/audit',     icon: ScrollText      },
  ],
  admin: [
    { label: 'Dashboard',   href: '/admin',             icon: LayoutDashboard },
    { label: 'Users',       href: '/admin/users',       icon: Users           },
    { label: 'Departments', href: '/admin/departments', icon: Building2       },
    { label: 'Archives',    href: '/admin/archives',    icon: Archive         },
    { label: 'Audit log',   href: '/admin/audit',       icon: ScrollText      },
  ],
};

const ROLE_LABEL: Record<UserRole, string> = {
  student:    'Student',
  supervisor: 'Supervisor',
  panel:      'Panel member',
  hod:        'HoD / Coordinator',
  admin:      'Administrator',
};

export function Sidebar({
  role,
  userName,
  avatarUrl,
}: {
  role: UserRole;
  userName: string;
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();
  const items = NAV_BY_ROLE[role];

  return (
    <aside className="flex h-screen w-64 flex-col bg-[#0e3d28]">

      {/* ── Brand ──────────────────────────────────────────────────── */}
      <div className="flex h-16 shrink-0 items-center gap-3 px-5">
        {/* The shield SVG has a white upper half — pops on dark green */}
        <Logo size={34} />
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-bold tracking-tight text-white">OTAS</span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-white/40">UMaT</span>
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Main navigation">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-white/35">
          {ROLE_LABEL[role]}
        </p>

        <ul className="space-y-0.5">
          {items.map((item) => {
            const active =
              item.href === pathname ||
              (item.href !== `/${role}` && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    active
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors duration-150',
                      active ? 'text-white' : 'text-white/45 group-hover:text-white/80'
                    )}
                    aria-hidden
                  />
                  {item.label}

                  {/* Active dot indicator */}
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/60" aria-hidden />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── User section ───────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-white/10 p-4 space-y-3">
        {/* Avatar + name + role */}
        <div className="flex items-center gap-3 rounded-lg bg-white/8 px-3 py-2.5">
          <div className="h-9 w-9 shrink-0 rounded-full overflow-hidden">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={userName}
                width={36}
                height={36}
                className="h-9 w-9 object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
                {userName?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {userName}
            </p>
            <p className="truncate text-xs text-white/50">
              {ROLE_LABEL[role]}
            </p>
          </div>
        </div>

        {/* Sign out */}
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/55 transition-colors duration-150 hover:bg-white/10 hover:text-white/90"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
