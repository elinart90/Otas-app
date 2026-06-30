'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, BookOpen, Filter } from 'lucide-react';
import { Logo } from '@/components/layout/logo';
import type { ArchiveCardData } from '@/components/archive/archive-card';

type Programme = { id: string; name: string; code: string };

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase() ?? '').join('');
}

function getMemberNames(archive: ArchiveCardData): string[] {
  if (!archive.members) return archive.author?.full_name ? [archive.author.full_name] : [];
  const rows = Array.isArray(archive.members) ? archive.members : [archive.members];
  const sorted = [...rows].sort((a: any, b: any) => {
    if (a.role_in_team === 'lead') return -1;
    if (b.role_in_team === 'lead') return 1;
    return (a.user?.full_name ?? '').localeCompare(b.user?.full_name ?? '');
  });
  return sorted.map((r: any) => r.user?.full_name).filter(Boolean) as string[];
}

export default function PublicBrowsePage() {
  const [q, setQ] = useState('');
  const [year, setYear] = useState('');
  const [programmeId, setProgrammeId] = useState('');
  const [archives, setArchives] = useState<ArchiveCardData[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetch_ = useCallback(async (qv: string, yv: string, pv: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (qv) params.set('q', qv);
      if (yv) params.set('year', yv);
      if (pv) params.set('programme_id', pv);
      const res = await fetch(`/api/archive/public?${params}`);
      const data = await res.json();
      if (data.ok) {
        setArchives(data.archives);
        setYears(data.years);
        setProgrammes(data.programmes);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_('', '', ''); }, [fetch_]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetch_(q, year, programmeId), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q, year, programmeId, fetch_]);

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
            className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Hero */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-muted">
            <BookOpen className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            UMaT Thesis Archive
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse finalised undergraduate project reports from the University of Mines and Technology.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Full documents are available to UMaT staff and students after signing in.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-5 grid gap-3 rounded-xl border border-border bg-card p-4 shadow-card md:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title or abstract…"
              className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All years</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <select
            value={programmeId}
            onChange={(e) => setProgrammeId(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All programmes</option>
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
            ))}
          </select>
        </div>

        {/* Results */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-28 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
        ) : archives.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium text-foreground">No matching archives</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {q || year || programmeId ? 'Try adjusting your filters.' : 'The archive is empty.'}
            </p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              {archives.length} {archives.length === 1 ? 'result' : 'results'}
            </p>
            <div className="space-y-3">
              {archives.map((a) => (
                <PublicArchiveCard key={a.id} archive={a} />
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        University of Mines and Technology, Tarkwa · OTAS ·{' '}
        <Link href="/login" className="text-primary hover:underline">Staff / Student login</Link>
      </footer>
    </div>
  );
}

function PublicArchiveCard({ archive }: { archive: ArchiveCardData }) {
  const archiveRow = Array.isArray(archive.archives)
    ? archive.archives[0] ?? null
    : archive.archives ?? null;
  const code = (archiveRow as any)?.archive_code ?? '—';
  const excerpt = archive.abstract
    ? archive.abstract.slice(0, 260) + (archive.abstract.length > 260 ? '…' : '')
    : null;
  const authors = getMemberNames(archive);
  const authorText = authors.length === 0
    ? null
    : authors.length <= 3
      ? authors.join(', ')
      : `${authors.slice(0, 2).join(', ')} +${authors.length - 2} more`;

  return (
    <Link
      href={`/browse/${archive.id}`}
      className="group block rounded-xl border border-border bg-card p-5 shadow-card transition-all duration-150 hover:border-primary/30 hover:shadow-elevated"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground group-hover:text-primary">
            {archive.title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {archive.academic_year}
            {archive.programme?.code ? ` · ${archive.programme.code}` : ''}
            {authorText ? ` · ${authorText}` : ''}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
          {code}
        </span>
      </div>

      {excerpt && (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {excerpt}
        </p>
      )}

      {archive.keywords && archive.keywords.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {archive.keywords.slice(0, 6).map((k) => (
            <span
              key={k}
              className="inline-flex items-center rounded-full bg-primary-muted px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {k}
            </span>
          ))}
        </div>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">
        Sign in to view the full document →
      </p>
    </Link>
  );
}
