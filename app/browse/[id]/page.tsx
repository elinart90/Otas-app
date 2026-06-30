'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogIn, BookOpen, Lock } from 'lucide-react';
import { Logo } from '@/components/layout/logo';

type Member = {
  role_in_team: string;
  user: { full_name: string; index_number: string | null } | null;
};

type PublicDetail = {
  ok: boolean;
  project: {
    id: string;
    title: string;
    abstract: string | null;
    keywords: string[] | null;
    academic_year: number;
    group_id: string | null;
    programme: { name: string; code: string } | null;
    author: { full_name: string; index_number: string | null } | null;
    supervisor: { full_name: string } | null;
    members: Member | Member[] | null;
  };
  archive: { id: string; archive_code: string; year: number } | null;
  requiresLogin: boolean;
};

export default function PublicArchiveDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'error'; message: string }
    | { kind: 'ok'; data: PublicDetail }
  >({ kind: 'loading' });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/archive/public/${params.id}`);
        const data = await res.json();
        if (!data.ok) {
          setState({ kind: 'error', message: data.error ?? 'Not found' });
          return;
        }
        setState({ kind: 'ok', data });
      } catch (e: any) {
        setState({ kind: 'error', message: e?.message ?? 'Network error' });
      }
    })();
  }, [params.id]);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size={28} />
            <div>
              <p className="text-sm font-semibold text-foreground">OTAS — UMaT</p>
              <p className="text-[11px] text-muted-foreground">Online Thesis Archive</p>
            </div>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <LogIn className="h-3.5 w-3.5" />
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-6 py-8">
        {state.kind === 'loading' && (
          <div className="space-y-3">
            <div className="h-8 w-2/3 animate-pulse rounded-lg bg-card" />
            <div className="h-4 w-1/3 animate-pulse rounded-lg bg-card" />
          </div>
        )}

        {state.kind === 'error' && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {state.message}
          </div>
        )}

        {state.kind === 'ok' && (() => {
          const { project, archive } = state.data;

          const memberRows: Member[] = Array.isArray(project.members)
            ? project.members
            : project.members ? [project.members] : [];
          const sortedMembers = [...memberRows].sort((a, b) => {
            if (a.role_in_team === 'lead') return -1;
            if (b.role_in_team === 'lead') return 1;
            return (a.user?.full_name ?? '').localeCompare(b.user?.full_name ?? '');
          });
          const isGroup = !!project.group_id && sortedMembers.length > 0;

          return (
            <>
              {/* Header */}
              <header>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {project.programme?.code ?? 'Archive'} · {project.academic_year}
                  {archive?.archive_code ? ` · ${archive.archive_code}` : ''}
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-foreground">{project.title}</h1>
                {project.supervisor?.full_name && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Supervisor: {project.supervisor.full_name}
                  </p>
                )}
              </header>

              {/* Login gate — full document */}
              <div className="rounded-xl border border-primary/25 bg-primary-muted p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Full document available to UMaT members
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sign in with your UMaT student or staff account to view the complete thesis.
                </p>
                <Link
                  href={`/login?redirect=/archive/${project.id}`}
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <LogIn className="h-4 w-4" />
                  Sign in to read
                </Link>
              </div>

              {/* Authors / Group */}
              <section className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold text-foreground">
                  {isGroup ? 'Group members' : 'Author'}
                </h2>
                {isGroup ? (
                  <div className="mt-3 flex flex-wrap gap-3">
                    {sortedMembers.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {m.user?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-foreground">
                            {m.user?.full_name ?? '—'}
                            {m.role_in_team === 'lead' && (
                              <span className="ml-1.5 rounded-full bg-primary-muted px-1.5 py-0.5 text-[9px] font-bold text-primary">
                                Leader
                              </span>
                            )}
                          </p>
                          {m.user?.index_number && (
                            <p className="text-[10px] text-muted-foreground">{m.user.index_number}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : project.author ? (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {project.author.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{project.author.full_name}</p>
                      {project.author.index_number && (
                        <p className="text-xs text-muted-foreground">{project.author.index_number}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">Unknown author</p>
                )}
              </section>

              {/* Abstract */}
              {project.abstract && (
                <section className="rounded-xl border border-border bg-card p-5">
                  <h2 className="text-sm font-semibold text-foreground">Abstract</h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {project.abstract}
                  </p>
                </section>
              )}

              {/* Keywords */}
              {project.keywords && project.keywords.length > 0 && (
                <section className="rounded-xl border border-border bg-card p-5">
                  <h2 className="text-sm font-semibold text-foreground">Keywords</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {project.keywords.map((k) => (
                      <span
                        key={k}
                        className="inline-flex items-center rounded-full bg-primary-muted px-2.5 py-1 text-xs font-medium text-primary"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </>
          );
        })()}

        <div className="flex items-center gap-4">
          <Link href="/browse" className="text-sm text-muted-foreground hover:underline">
            ← Back to archive
          </Link>
          <Link href="/login" className="text-sm text-primary hover:underline">
            Sign in for full access →
          </Link>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        University of Mines and Technology, Tarkwa · OTAS ·{' '}
        <Link href="/login" className="text-primary hover:underline">Staff / Student login</Link>
      </footer>
    </div>
  );
}
