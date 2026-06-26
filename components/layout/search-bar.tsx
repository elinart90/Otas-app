'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Archive, FolderOpen, Users, Loader2 } from 'lucide-react';
import type { UserRole } from '@/lib/rbac/permissions';

const ARCHIVE_HREF: Record<UserRole, string> = {
  student:    '/student/archive',
  supervisor: '/supervisor/archive',
  panel:      '/panel/archive',
  hod:        '/hod/archive',
  admin:      '/admin/archives',
};

type ArchiveResult = {
  id: string;
  archive_code: string;
  year: number;
  projects: { id: string; title: string; programmes: { name: string; code: string } | null } | null;
};
type ProjectResult = { id: string; title: string; status: string; academic_year: number };
type UserResult   = { id: string; full_name: string; role: string; email: string; index_number: string | null };

type Results = {
  archives: ArchiveResult[];
  projects: ProjectResult[];
  users:    UserResult[];
};

function projectHref(role: UserRole, projectId: string): string {
  if (role === 'supervisor') return `/supervisor/projects/${projectId}`;
  if (role === 'hod')        return `/hod/overview`;
  return `/admin`;
}

export function SearchBar({ role }: { role: UserRole }) {
  const router = useRouter();
  const [query,   setQuery]   = useState('');
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Results | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const timerRef     = useRef<ReturnType<typeof setTimeout>>();

  // Close dropdown on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // ⌘K / Ctrl+K shortcut + Escape
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, []);

  const runSearch = useCallback((q: string) => {
    clearTimeout(timerRef.current);
    if (q.length < 2) { setResults(null); setLoading(false); return; }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) setResults(await res.json());
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    setOpen(true);
    runSearch(q);
  }

  function clear() {
    setQuery('');
    setResults(null);
    setOpen(false);
  }

  function navigate(href: string) {
    router.push(href);
    setOpen(false);
    setQuery('');
    setResults(null);
  }

  const hasResults =
    results &&
    (results.archives.length > 0 || results.projects.length > 0 || results.users.length > 0);

  const showDropdown = open && query.length >= 2;

  return (
    <div ref={containerRef} className="relative flex max-w-sm flex-1">
      {/* Input */}
      <div className="flex flex-1 items-center gap-2 rounded-lg border border-input bg-secondary px-3 py-2 text-sm transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30">
        {loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        )}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { if (query.length >= 2) setOpen(true); }}
          placeholder="Search anything..."
          className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
          aria-label="Search"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
        />

        {query ? (
          <button
            onClick={clear}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="hidden rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] sm:inline">
            ⌘K
          </kbd>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[340px] rounded-xl border border-border bg-card shadow-lg overflow-hidden">

          {/* No results */}
          {!loading && !hasResults && (
            <p className="px-4 py-7 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {/* Archives */}
          {(results?.archives.length ?? 0) > 0 && (
            <section>
              <div className="flex items-center gap-2 border-b border-border bg-secondary/60 px-4 py-1.5">
                <Archive className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Archives
                </span>
              </div>
              {results!.archives.map((a) => (
                <button
                  key={a.id}
                  onClick={() => navigate(ARCHIVE_HREF[role])}
                  className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left hover:bg-secondary transition-colors"
                >
                  <span className="text-sm font-medium text-foreground line-clamp-1">
                    {a.projects?.title ?? 'Untitled'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {a.archive_code} &middot; {a.year}
                    {a.projects?.programmes?.code ? ` · ${a.projects.programmes.code}` : ''}
                  </span>
                </button>
              ))}
            </section>
          )}

          {/* Projects */}
          {(results?.projects.length ?? 0) > 0 && (
            <section>
              <div className="flex items-center gap-2 border-b border-border bg-secondary/60 px-4 py-1.5">
                <FolderOpen className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Projects
                </span>
              </div>
              {results!.projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(projectHref(role, p.id))}
                  className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left hover:bg-secondary transition-colors"
                >
                  <span className="text-sm font-medium text-foreground line-clamp-1">{p.title}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {p.status.replace(/_/g, ' ')} &middot; {p.academic_year}
                  </span>
                </button>
              ))}
            </section>
          )}

          {/* Users */}
          {(results?.users.length ?? 0) > 0 && (
            <section>
              <div className="flex items-center gap-2 border-b border-border bg-secondary/60 px-4 py-1.5">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Users
                </span>
              </div>
              {results!.users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => navigate('/admin/users')}
                  className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left hover:bg-secondary transition-colors"
                >
                  <span className="text-sm font-medium text-foreground">{u.full_name}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {u.role.replace(/_/g, ' ')} &middot; {u.index_number ?? u.email}
                  </span>
                </button>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
