import type { UserRole } from '@/lib/rbac/permissions';
import { UserMenu } from './user-menu';
import { SearchBar } from './search-bar';
import { NotificationBell } from '@/components/notifications/bell';

export function TopHeader({
  userName,
  role,
  avatarUrl,
  userId,
}: {
  userName: string;
  role: UserRole;
  avatarUrl: string | null;
  userId: string;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6">
      {/* ── Search bar ─────────────────────────────────────────────── */}
      <SearchBar role={role} />

      {/* ── Right side ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Live notification bell */}
        <NotificationBell userId={userId} />

        {/* User profile dropdown */}
        <UserMenu userName={userName} role={role} avatarUrl={avatarUrl} />
      </div>
    </header>
  );
}
