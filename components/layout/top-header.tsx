import { Bell } from 'lucide-react';
import type { UserRole } from '@/lib/rbac/permissions';
import { UserMenu } from './user-menu';
import { SearchBar } from './search-bar';

export function TopHeader({
  userName,
  role,
  avatarUrl,
}: {
  userName: string;
  role: UserRole;
  avatarUrl: string | null;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6">
      {/* ── Search bar ─────────────────────────────────────────────── */}
      <SearchBar role={role} />

      {/* ── Right side ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Notification bell with dot */}
        <div className="relative rounded-lg p-2 text-muted-foreground">
          <Bell className="h-5 w-5" aria-hidden />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
          <span className="sr-only">Notifications</span>
        </div>

        {/* User profile dropdown */}
        <UserMenu userName={userName} role={role} avatarUrl={avatarUrl} />
      </div>
    </header>
  );
}
