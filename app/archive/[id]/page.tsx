'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PdfViewer } from '@/components/archive/pdf-viewer';

type Member = {
  role_in_team: string;
  user: { full_name: string; index_number: string | null } | null;
};

type ArchiveDetail = {
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
  archive: {
    id: string;
    archive_code: string;
    document_url: string;
    year: number;
  } | null;
  signedUrl: string | null;
  hasDocument: boolean;
  viewer: { name: string; email: string | null };
};

export default function ArchiveDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'error'; message: string }
    | { kind: 'ok'; data: ArchiveDetail }
  >({ kind: 'loading' });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/archive/${params.id}`);
        const data = await res.json();
        if (!data.ok) {
          setState({ kind: 'error', message: data.error ?? 'Archive not found' });
          return;
        }
        setState({ kind: 'ok', data });
      } catch (e: any) {
        setState({ kind: 'error', message: e?.message ?? 'Network error' });
      }
    })();
  }, [params.id]);

  if (state.kind === 'loading') {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <p className="text-sm text-muted-foreground">Loading archive…</p>
      </main>
    );
  }
  if (state.kind === 'error') {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.message}
        </div>
        <BackButton />
      </main>
    );
  }

  const { project, archive, signedUrl, hasDocument, viewer } = state.data;
  const watermarkText = `${viewer.name} · ${new Date().toLocaleDateString()}`;

  // Resolve all group members (sorted: lead first)
  const memberRows: Member[] = Array.isArray(project.members)
    ? project.members
    : project.members
      ? [project.members]
      : [];
  const sortedMembers = [...memberRows].sort((a, b) => {
    if (a.role_in_team === 'lead' && b.role_in_team !== 'lead') return -1;
    if (b.role_in_team === 'lead' && a.role_in_team !== 'lead') return 1;
    return (a.user?.full_name ?? '').localeCompare(b.user?.full_name ?? '');
  });

  const isGroupProject = !!project.group_id && sortedMembers.length > 0;

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {project.programme?.code ?? 'Archive'} · {project.academic_year}
          {archive?.archive_code ? ` · ${archive.archive_code}` : ''}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          {project.title}
        </h1>
        {project.supervisor?.full_name && (
          <p className="mt-1 text-sm text-muted-foreground">
            Supervisor: {project.supervisor.full_name}
          </p>
        )}
      </header>

      {/* PDF viewer or fallback */}
      {hasDocument && signedUrl ? (
        <PdfViewer signedUrl={signedUrl} watermarkText={watermarkText} />
      ) : (
        <div className="rounded-lg border border-warning/40 bg-warning/15 p-5 text-sm text-foreground">
          <p className="font-semibold">No document on file</p>
          <p className="mt-1 text-muted-foreground">
            This archive entry has metadata but the full document has not yet been uploaded.
          </p>
        </div>
      )}

      {/* Authors / Group members */}
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">
          {isGroupProject ? 'Group members' : 'Author'}
        </h2>
        {isGroupProject ? (
          <div className="mt-3 space-y-2">
            {sortedMembers.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {m.user?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {m.user?.full_name ?? '—'}
                    {m.role_in_team === 'lead' && (
                      <span className="ml-2 rounded-full bg-primary-muted px-2 py-0.5 text-[10px] font-semibold text-primary">
                        Leader
                      </span>
                    )}
                  </p>
                  {m.user?.index_number && (
                    <p className="text-xs text-muted-foreground">{m.user.index_number}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : project.author ? (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
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
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Abstract</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {project.abstract}
          </p>
        </section>
      )}

      {/* Keywords */}
      {project.keywords && project.keywords.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-5">
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

      <BackButton />
    </main>
  );
}

function BackButton() {
  const router = useRouter();
  return (
    <div>
      <button
        type="button"
        onClick={() => router.back()}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Back
      </button>
    </div>
  );
}
