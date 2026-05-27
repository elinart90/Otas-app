'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function ScoringDecisionForm({ defenseId }: { defenseId: string }) {
  const router = useRouter();
  const [decision, setDecision] = useState<'passed' | 'failed' | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!decision || notes.trim().length < 20) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/scoring/${defenseId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, notes: notes.trim() }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? 'Decision failed');
        return;
      }
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = !submitting && decision !== null && notes.trim().length >= 20;

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground">
        Make the final decision
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        After reviewing panelist scores and discussion, finalise the outcome.
        This action marks the defense complete and updates the project status.
        It cannot be undone.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setDecision('passed')}
          className={cn(
            'rounded-md border px-4 py-3 text-sm transition-colors',
            decision === 'passed'
              ? 'border-success bg-success/20 text-success-foreground font-medium'
              : 'border-border bg-background text-muted-foreground hover:bg-secondary'
          )}
        >
          ✓ Passed
        </button>
        <button
          type="button"
          onClick={() => setDecision('failed')}
          className={cn(
            'rounded-md border px-4 py-3 text-sm transition-colors',
            decision === 'failed'
              ? 'border-destructive bg-destructive/20 text-destructive font-medium'
              : 'border-border bg-background text-muted-foreground hover:bg-secondary'
          )}
        >
          ✗ Failed
        </button>
      </div>

      <div className="mt-4">
        <label className="text-xs font-medium text-foreground">
          Decision notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          minLength={20}
          maxLength={2000}
          placeholder="Reasoning for the decision (visible to student and panel)…"
          className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums">
          {notes.length} / 2000
        </p>
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className={cn(
          'mt-4 w-full rounded-md px-5 py-2.5 text-sm font-medium transition',
          canSubmit
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'cursor-not-allowed bg-muted text-muted-foreground'
        )}
      >
        {submitting ? 'Submitting…' : 'Finalise decision'}
      </button>
    </section>
  );
}
