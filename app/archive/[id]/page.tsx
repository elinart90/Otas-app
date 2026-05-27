'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PdfViewer } from '@/components/archive/pdf-viewer';
import { useRouter } from 'next/navigation';

type ArchiveDetail = {
  ok: boolean;
  project: {
    id: string;
    title: string;
    abstract: string | null;
    keywords: string[] | null;
    academic_year: number;
    programme: { name: string; code: string } | null;
    author: { full_name: string; index_number: string | null } | null;
    supervisor: { full_name: string } | null;
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
    { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ok'; data: ArchiveDetail }
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
        <BackLink />
      </main>
    );
  }

  const { project, archive, signedUrl, hasDocument, viewer } = state.data;
  const watermarkText = `${viewer.name} · ${new Date().toLocaleDateString()}`;

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
        {project.author && (
          <p className="mt-1 text-sm text-muted-foreground">
            {project.author.full_name}
            {project.author.index_number ? ` · ${project.author.index_number}` : ''}
            {project.supervisor?.full_name ? ` · Supervisor: ${project.supervisor.full_name}` : ''}
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
            This archive entry has metadata but the full document has not yet
            been uploaded by the department administrator.
          </p>
        </div>
      )}

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

      <BackLink />
    </main>
  );
}

function BackLink() {
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
