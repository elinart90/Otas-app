import { Bell, Search, ChevronDown } from 'lucide-react';
import type { UserRole } from '@/lib/rbac/permissions';

const ROLE_LABEL: Record<UserRole, string> = {
  student:    'Student',
  supervisor: 'Supervisor',
  panel:      'Panel member',
  hod:        'HoD / Coordinator',
  admin:      'Administrator',
};

export function TopHeader({
  userName,
  role,
}: {
  userName: string;
  role: UserRole;
}) {
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6">
      {/* ── Search bar (cosmetic placeholder) ─────────────────────── */}
      <div className="flex max-w-sm flex-1 items-center gap-2 rounded-lg border border-input bg-secondary px-3 py-2 text-sm text-muted-foreground">
        <Search className="h-4 w-4 shrink-0" aria-hidden />
        <span className="flex-1 select-none">Search anything...</span>
        <kbd className="hidden rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </div>

      {/* ── Right side ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Notification bell with dot */}
        <div className="relative rounded-lg p-2 text-muted-foreground">
          <Bell className="h-5 w-5" aria-hidden />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
          <span className="sr-only">Notifications</span>
        </div>

        {/* User profile pill */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">
            {initials}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-tight text-foreground">
              {userName}
            </p>
            <p className="text-xs text-muted-foreground">{ROLE_LABEL[role]}</p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </div>
      </div>
    </header>
  );
}
