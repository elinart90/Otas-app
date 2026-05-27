'use client';

import { useEffect, useState } from 'react';

type MatchedPassage = {
  studentStart: number;
  studentEnd: number;
  shingleCount: number;
  excerpt?: string;
};

type Match = {
  id: string;
  similarity_score: number;
  matched_passages: MatchedPassage[];
  matched_archive_id: string;
  projects: { title: string; academic_year: number } | null;
};

type Report = {
  id: string;
  document_name: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  overall_similarity: number | null;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
};

function bandFor(score: number) {
  if (score < 0.15) return { tone: 'success' as const, label: 'Low overlap' };
  if (score < 0.35) return { tone: 'warning' as const, label: 'Moderate overlap' };
  return { tone: 'destructive' as const, label: 'High overlap' };
}

export function ReportDetail({ reportId }: { reportId: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function fetchOnce() {
      try {
        const res = await fetch(`/api/plagiarism/reports/${reportId}`);
        const data = await res.json();
        if (cancelled) return;
        if (!data.ok) {
          setError(data.error ?? 'Failed to load report');
          return;
        }
        setReport(data.report);
        setMatches(data.matches);

        // Poll while still processing
        if (data.report.status === 'queued' || data.report.status === 'processing') {
          timer = setTimeout(fetchOnce, 2500);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Network error');
      }
    }

    fetchOnce();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [reportId]);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (!report) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Loading report…
      </div>
    );
  }

  if (report.status === 'queued' || report.status === 'processing') {
    return (
      <div className="rounded-lg border border-info/30 bg-info/10 p-6">
        <p className="text-base font-semibold text-foreground">
          {report.status === 'queued' ? 'Queued for processing' : 'Processing your document'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Extracting text and comparing against the archive. This usually takes 10-30
          seconds. This page will refresh automatically.
        </p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-2/3 animate-pulse bg-info" />
        </div>
      </div>
    );
  }

  if (report.status === 'failed') {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6">
        <p className="text-base font-semibold text-foreground">Processing failed</p>
        <p className="mt-1 text-sm text-destructive">
          {report.error_message ?? 'Unknown error'}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Try uploading the document again. If your PDF was scanned (image-based),
          you'll need a text-extracted version.
        </p>
      </div>
    );
  }

  // Completed
  const overall = report.overall_similarity ?? 0;
  const band = bandFor(overall);

  return (
    <div className="space-y-5">
      {/* Headline */}
      <div
        className={`rounded-lg border p-5 ${
          band.tone === 'success'
            ? 'border-success/30 bg-success/10'
            : band.tone === 'warning'
              ? 'border-warning/40 bg-warning/15'
              : 'border-destructive/30 bg-destructive/10'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-foreground">{band.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {matches.length === 0
                ? 'No matched passages were found in the institutional archive.'
                : `Found ${matches.length} matching archive ${matches.length === 1 ? 'entry' : 'entries'} with overlapping passages.`}
            </p>
          </div>
          <span className="text-3xl font-semibold tabular-nums text-foreground">
            {Math.round(overall * 100)}%
          </span>
        </div>
      </div>

      {/* Matches */}
      {matches.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Matched archive entries
          </h3>
          <div className="space-y-3">
            {matches.map((m) => {
              const pct = Math.round(m.similarity_score * 100);
              return (
                <div
                  key={m.id}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {m.projects?.title ?? 'Unknown archive entry'}
                      </p>
                      {m.projects?.academic_year && (
                        <p className="text-xs text-muted-foreground">
                          Archived {m.projects.academic_year}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {pct}%
                    </span>
                  </div>

                  {/* Passages */}
                  {m.matched_passages.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {m.matched_passages.slice(0, 5).map((p, i) => (
                        <li
                          key={i}
                          className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs"
                        >
                          <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                            <span className="pill pill-warning">
                              {p.shingleCount} shingles
                            </span>
                            <span>
                              Tokens {p.studentStart}–{p.studentEnd}
                            </span>
                          </div>
                          {p.excerpt && (
                            <p className="leading-relaxed text-foreground">
                              "{p.excerpt}…"
                            </p>
                          )}
                        </li>
                      ))}
                      {m.matched_passages.length > 5 && (
                        <li className="text-xs text-muted-foreground">
                          + {m.matched_passages.length - 5} more matched passages
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
