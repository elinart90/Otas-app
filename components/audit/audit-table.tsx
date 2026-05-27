'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader, EmptyCard } from '@/components/layout/dashboard-bits';
import { cn } from '@/lib/utils';

type AuditRow = {
  id: string;
  viewed_at: string;
  user_agent: string | null;
  user: { id: string; full_name: string; email: string; role: string } | null;
  archive: {
    id: string;
    archive_code: string;
    project: { id: string; title: string; academic_year: number } | null;
  } | null;
};

type AuditResponse = {
  ok: boolean;
  rows: AuditRow[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function AuditTable({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const [q, setQ] = useState('');
  const [from, setFrom] = useState(daysAgoISO(30));
  const [to, setTo] = useState(todayISO());
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      const res = await fetch(`/api/audit?${params.toString()}`);
      const body = await res.json();
      if (!body.ok) {
        setError(body.error ?? 'Unknown error');
        setData(null);
      } else {
        setData(body);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Network error');
    } finally {
      setLoading(false);
    }
  }, [q, from, to, page]);

  // Debounced fetch on filter change
  useEffect(() => {
    const t = setTimeout(fetchAudit, 300);
    return () => clearTimeout(t);
  }, [fetchAudit]);

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />

      {/* Filters */}
      <div className="mb-4 grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[1fr_auto_auto]">
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Search
          </label>
          <input
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Name, email, archive code, project title…"
            className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            From
          </label>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="mt-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            To
          </label>
          <input
            type="date"
            value={to}
            min={from}
            max={todayISO()}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="mt-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Status row */}
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <p>
          {loading
            ? 'Loading…'
            : data
              ? `${data.total} total record${data.total === 1 ? '' : 's'} · page ${data.page} of ${Math.max(data.pages, 1)}`
              : ''}
        </p>
      </div>

      {/* Table */}
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : !data || data.rows.length === 0 ? (
        <EmptyCard
          title="No audit records in this period"
          body="Try widening the date range or clearing the search."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/30">
              <tr>
                <Th>Viewed at</Th>
                <Th>Viewer</Th>
                <Th>Role</Th>
                <Th>Archive</Th>
                <Th>Project</Th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border/40 last:border-b-0 hover:bg-secondary/30"
                >
                  <Td>
                    <span className="tabular-nums text-xs text-muted-foreground">
                      {new Date(row.viewed_at).toLocaleString()}
                    </span>
                  </Td>
                  <Td>
                    <p className="font-medium text-foreground">
                      {row.user?.full_name ?? '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.user?.email ?? ''}
                    </p>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs">
                      {row.user?.role ?? '—'}
                    </span>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center rounded-full bg-primary-muted px-2 py-0.5 text-xs font-medium text-primary">
                      {row.archive?.archive_code ?? '—'}
                    </span>
                  </Td>
                  <Td>
                    <p className="text-foreground">
                      {row.archive?.project?.title ?? '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.archive?.project?.academic_year ?? ''}
                    </p>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={cn(
              'rounded-md border border-border bg-card px-3 py-1.5 text-sm transition-colors',
              page <= 1 ? 'cursor-not-allowed opacity-40' : 'hover:bg-secondary'
            )}
          >
            ← Previous
          </button>
          <span className="text-xs text-muted-foreground">
            Page {data.page} of {data.pages}
          </span>
          <button
            type="button"
            disabled={page >= data.pages}
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            className={cn(
              'rounded-md border border-border bg-card px-3 py-1.5 text-sm transition-colors',
              page >= data.pages
                ? 'cursor-not-allowed opacity-40'
                : 'hover:bg-secondary'
            )}
          >
            Next →
          </button>
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
  return <td className="px-4 py-3 align-top">{children}</td>;
}
