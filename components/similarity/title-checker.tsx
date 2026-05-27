'use client';

import { useEffect, useRef, useState } from 'react';
import type { SimilarityResult } from '@/lib/similarity/title-check';
import type { TitleCheckResponse } from '@/app/api/similarity/title/route';
import { MatchRow } from './match-row';

const DEBOUNCE_MS = 400;
const MIN_LENGTH = 5;

type Status = 'idle' | 'typing' | 'checking' | 'ok' | 'error';

export function TitleChecker() {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<SimilarityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (title.trim().length < MIN_LENGTH) {
      setStatus('idle');
      setResult(null);
      setError(null);
      return;
    }

    setStatus('typing');
    debounceRef.current = setTimeout(async () => {
      setStatus('checking');
      setError(null);
      try {
        const res = await fetch('/api/similarity/title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, persist: false }),
        });
        const data = (await res.json()) as TitleCheckResponse;
        if (!data.ok) {
          setStatus('error');
          setError(data.error);
          return;
        }
        setResult(data.result);
        setStatus('ok');
      } catch (e: any) {
        setStatus('error');
        setError(e?.message ?? 'Network error');
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [title]);

  const overallTone =
    !result || result.highestScore === 0
      ? null
      : result.band === 'original'
        ? 'success'
        : result.band === 'review'
          ? 'warning'
          : 'destructive';

  return (
    <div className="space-y-5">
      {/* Input */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-card">
        <label htmlFor="title" className="mb-2 block text-sm font-medium">
          Proposed project title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Web-Based Patient Records Management System"
          maxLength={300}
          className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {title.trim().length < MIN_LENGTH
              ? `Type at least ${MIN_LENGTH} characters to begin checking.`
              : status === 'typing'
                ? 'Waiting for you to stop typing…'
                : status === 'checking'
                  ? 'Checking against archive…'
                  : status === 'error'
                    ? 'Check failed.'
                    : ''}
          </span>
          <span className="tabular-nums">{title.length}/300</span>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Verdict banner */}
      {status === 'ok' && result && result.matches.length > 0 && overallTone && (
        <div
          className={`rounded-lg border p-5 ${
            overallTone === 'success'
              ? 'border-success/30 bg-success/10'
              : overallTone === 'warning'
                ? 'border-warning/40 bg-warning/15'
                : 'border-destructive/30 bg-destructive/10'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-foreground">
                {overallTone === 'success' && 'Title appears distinct'}
                {overallTone === 'warning' && 'Review related work'}
                {overallTone === 'destructive' && 'Title is too similar to existing work'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {overallTone === 'success' &&
                  'No close matches in the institutional archive. You can proceed.'}
                {overallTone === 'warning' &&
                  'There is moderate overlap with existing work. Review the matches below and consider adjusting your scope or wording.'}
                {overallTone === 'destructive' &&
                  'A high-similarity match was found. You will need to revise your title before submitting.'}
              </p>
            </div>
            <span className="text-3xl font-semibold tabular-nums text-foreground">
              {Math.round(result.highestScore * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Empty corpus / no matches */}
      {status === 'ok' && result && result.matches.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No archived projects to compare against yet. Once the archive is
          populated, your titles will be checked here.
        </div>
      )}

      {/* Match list */}
      {status === 'ok' && result && result.matches.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Top {result.matches.length} closest match
            {result.matches.length === 1 ? '' : 'es'}
          </h3>
          <div className="space-y-2">
            {result.matches.map((m, i) => (
              <MatchRow key={`${m.archiveId}-${i}`} match={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
