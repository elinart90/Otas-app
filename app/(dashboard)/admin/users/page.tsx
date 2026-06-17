import { PageHeader, EmptyCard } from '@/components/layout/dashboard-bits';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ROLE_LABEL: Record<string, string> = {
  student: 'Student',
  supervisor: 'Supervisor',
  panel: 'Panel member',
  hod: 'HoD / Coordinator',
  admin: 'Administrator',
};

const ROLE_PILL: Record<string, string> = {
  student: 'pill pill-info',
  supervisor: 'pill pill-success',
  panel: 'pill pill-warning',
  hod: 'pill pill-muted',
  admin: 'pill pill-muted',
};

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  index_number: string | null;
  staff_id: string | null;
  created_at: string;
  department: { name: string } | null;
  programme: { name: string } | null;
};

export default async function AdminUsersPage() {
  const supabase = createClient();

  const { data: users, error } = await supabase
    .from('users')
    .select(
      `id, full_name, email, role, index_number, staff_id, created_at,
       department:department_id(name),
       programme:programme_id(name)`
    )
    .order('created_at', { ascending: false });

  const rows = (users ?? []) as unknown as UserRow[];

  const byCounts: Record<string, number> = {};
  for (const u of rows) {
    byCounts[u.role] = (byCounts[u.role] ?? 0) + 1;
  }

  return (
    <>
      <PageHeader
        title="User management"
        subtitle={`${rows.length} registered user${rows.length === 1 ? '' : 's'} across all roles.`}
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {/* Role breakdown */}
      {rows.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {Object.entries(byCounts).map(([role, count]) => (
            <span
              key={role}
              className={ROLE_PILL[role] ?? 'pill pill-muted'}
            >
              {ROLE_LABEL[role] ?? role}: {count}
            </span>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyCard
          title="No users yet"
          body="Users appear here once they register."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/30">
              <tr>
                <Th>Name</Th>
                <Th>Role</Th>
                <Th>ID</Th>
                <Th>Department</Th>
                <Th>Programme</Th>
                <Th>Registered</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-border/40 last:border-b-0 hover:bg-secondary/30"
                >
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {u.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{u.full_name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span className={ROLE_PILL[u.role] ?? 'pill pill-muted'}>
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs text-muted-foreground">
                      {u.index_number ?? u.staff_id ?? '—'}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-muted-foreground">
                      {u.department?.name ?? '—'}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-muted-foreground">
                      {u.programme?.name ?? '—'}
                    </span>
                  </Td>
                  <Td>
                    <span className="tabular-nums text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-middle">{children}</td>;
}
