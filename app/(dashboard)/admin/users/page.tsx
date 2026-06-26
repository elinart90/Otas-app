import { PageHeader, EmptyCard } from '@/components/layout/dashboard-bits';
import { createClient } from '@/lib/supabase/server';
import { UsersTable, type UserRow } from './users-table';

export const dynamic = 'force-dynamic';

const NEW_BADGE_DAYS = 7;

export default async function AdminUsersPage() {
  const supabase = createClient();

  const [
    { data: { user: currentUser } },
    { data: users, error },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('users')
      .select(
        `id, full_name, email, role, index_number, staff_id, created_at,
         department:department_id(name),
         programme:programme_id(name)`
      )
      .order('created_at', { ascending: false }),
  ]);

  const rows = (users ?? []) as unknown as UserRow[];
  const currentUserId = currentUser?.id ?? '';

  const byCounts: Record<string, number> = {};
  for (const u of rows) {
    byCounts[u.role] = (byCounts[u.role] ?? 0) + 1;
  }

  const newCount = rows.filter(
    (u) =>
      Date.now() - new Date(u.created_at).getTime() <
      NEW_BADGE_DAYS * 24 * 60 * 60 * 1000
  ).length;

  const subtitle =
    newCount > 0
      ? `${rows.length} registered user${rows.length !== 1 ? 's' : ''} — ${newCount} new in the last ${NEW_BADGE_DAYS} days`
      : `${rows.length} registered user${rows.length !== 1 ? 's' : ''} across all roles.`;

  return (
    <>
      <PageHeader title="User management" subtitle={subtitle} />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyCard
          title="No users yet"
          body="Users appear here once they register."
        />
      ) : (
        <UsersTable
          users={rows}
          byCounts={byCounts}
          currentUserId={currentUserId}
        />
      )}
    </>
  );
}
