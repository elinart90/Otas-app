'use client';

import { startTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, UserPlus } from 'lucide-react';
import { deleteUserAction } from './actions';

// ── Types ────────────────────────────────────────────────────
export type UserRow = {
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

// ── Constants ────────────────────────────────────────────────
const ROLE_LABEL: Record<string, string> = {
  student:    'Student',
  supervisor: 'Supervisor',
  panel:      'Panel member',
  hod:        'HoD / Coordinator',
  admin:      'Administrator',
};

const ROLE_PILL: Record<string, string> = {
  student:    'pill pill-info',
  supervisor: 'pill pill-success',
  panel:      'pill pill-warning',
  hod:        'pill pill-muted',
  admin:      'pill pill-muted',
};

const NEW_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;  // 7 days
const RECENT_THRESHOLD_MS = 24 * 60 * 60 * 1000;   // 24 hours

function isNew(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < NEW_THRESHOLD_MS;
}

// ── Table primitives ─────────────────────────────────────────
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

// ── Delete cell ──────────────────────────────────────────────
function DeleteCell({ user, currentUserId }: { user: UserRow; currentUserId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  if (user.id === currentUserId) {
    return <span className="text-[11px] italic text-muted-foreground">You</span>;
  }

  const doDelete = () => {
    setPending(true);
    const fd = new FormData();
    fd.set('userId', user.id);
    startTransition(async () => {
      const res = await deleteUserAction(undefined, fd);
      setPending(false);
      if (res?.error) {
        setError(res.error);
        setConfirming(false);
      } else {
        router.refresh();
      }
    });
  };

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          Delete <strong className="text-foreground">{user.full_name}</strong>?
        </span>
        <button
          onClick={doDelete}
          disabled={pending}
          className="rounded bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-50"
        >
          {pending ? 'Deleting…' : 'Confirm'}
        </button>
        <button
          onClick={() => { setConfirming(false); setError(''); }}
          disabled={pending}
          className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-50"
        >
          Cancel
        </button>
        {error && (
          <span className="text-xs text-destructive">{error}</span>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title={`Delete ${user.full_name}`}
      className="rounded p-1 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

// ── Main export ──────────────────────────────────────────────
export function UsersTable({
  users,
  byCounts,
  currentUserId,
}: {
  users: UserRow[];
  byCounts: Record<string, number>;
  currentUserId: string;
}) {
  const recentCount = users.filter(
    (u) => Date.now() - new Date(u.created_at).getTime() < RECENT_THRESHOLD_MS
  ).length;

  return (
    <>
      {/* 24-hour new registrations banner */}
      {recentCount > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-info/30 bg-info/10 px-4 py-3 text-sm text-info">
          <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            <strong>{recentCount}</strong> new user{recentCount !== 1 ? 's' : ''} registered
            in the last 24 hours.
          </span>
        </div>
      )}

      {/* Role breakdown pills */}
      <div className="mb-5 flex flex-wrap gap-2">
        {Object.entries(byCounts).map(([role, count]) => (
          <span key={role} className={ROLE_PILL[role] ?? 'pill pill-muted'}>
            {ROLE_LABEL[role] ?? role}: {count}
          </span>
        ))}
      </div>

      {/* Table */}
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
              <Th><span className="sr-only">Actions</span></Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="group border-b border-border/40 last:border-b-0 hover:bg-secondary/30"
              >
                {/* Name + email */}
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {u.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-foreground">{u.full_name}</p>
                        {isNew(u.created_at) && (
                          <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </Td>

                {/* Role pill */}
                <Td>
                  <span className={ROLE_PILL[u.role] ?? 'pill pill-muted'}>
                    {ROLE_LABEL[u.role] ?? u.role}
                  </span>
                </Td>

                {/* Index / staff ID */}
                <Td>
                  <span className="font-mono text-xs text-muted-foreground">
                    {u.index_number ?? u.staff_id ?? '—'}
                  </span>
                </Td>

                {/* Department */}
                <Td>
                  <span className="text-muted-foreground">
                    {u.department?.name ?? '—'}
                  </span>
                </Td>

                {/* Programme */}
                <Td>
                  <span className="text-muted-foreground">
                    {u.programme?.name ?? '—'}
                  </span>
                </Td>

                {/* Date */}
                <Td>
                  <span className="tabular-nums text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </span>
                </Td>

                {/* Delete */}
                <Td>
                  <DeleteCell user={u} currentUserId={currentUserId} />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
