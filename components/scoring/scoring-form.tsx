'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CriterionRow, type Criterion } from './criterion-row';

type Score = {
  criterion_id: string;
  score: number | null;
  comment: string;
};

type FetchResponse = {
  ok: boolean;
  defense: { id: string; stage: string; status: string };
  criteria: Criterion[];
  scores: Array<{
    panelist_id: string;
    criterion_id: string;
    score: number;
    comment: string | null;
    submitted: boolean;
  }>;
};

export function ScoringForm({
  defenseId,
  currentUserId,
}: {
  defenseId: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [scoreState, setScoreState] = useState<Record<string, Score>>({});
  const [locked, setLocked] = useState(false);
  const [defenseStatus, setDefenseStatus] = useState<string>('scheduled');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/scoring/${defenseId}`);
        const data: FetchResponse = await res.json();
        if (!data.ok) throw new Error('Failed to load');
        setCriteria(data.criteria);
        setDefenseStatus(data.defense.status);

        const my = data.scores.filter((s) => s.panelist_id === currentUserId);
        const init: Record<string, Score> = {};
        for (const c of data.criteria) {
          const m = my.find((s) => s.criterion_id === c.id);
          init[c.id] = {
            criterion_id: c.id,
            score: m ? m.score : null,
            comment: m?.comment ?? '',
          };
        }
        setScoreState(init);

        // If ANY of my scores are submitted, lock the entire form
        if (my.length > 0 && my.some((s) => s.submitted)) {
          setLocked(true);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [defenseId, currentUserId]);

  function setScore(critId: string, score: number | null, comment: string) {
    setScoreState((prev) => ({
      ...prev,
      [critId]: { criterion_id: critId, score, comment },
    }));
    setSavedMessage(null);
  }

  async function save(submit: boolean) {
    setError(null);
    setSavedMessage(null);
    setSaving(true);
    try {
      // Only send rows where score is non-null
      const scores = Object.values(scoreState)
        .filter((s) => s.score !== null)
        .map((s) => ({
          criterion_id: s.criterion_id,
          score: s.score as number,
          comment: s.comment.trim() || null,
        }));
      if (scores.length === 0) {
        setError('Enter at least one score before saving.');
        return;
      }
      const res = await fetch(`/api/scoring/${defenseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores, submit }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? 'Save failed');
        return;
      }
      if (submit) {
        setLocked(true);
        setSavedMessage('Scores submitted and locked. The HoD can now decide.');
        router.refresh();
      } else {
        setSavedMessage('Draft saved.');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Network error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Loading rubric…
      </div>
    );
  }

  if (defenseStatus === 'completed') {
    return (
      <div className="rounded-lg border border-success/30 bg-success/10 p-5 text-sm text-success-foreground">
        <strong>Defense decided.</strong> Scoring is closed. View the
        aggregated results in the panel detail page.
      </div>
    );
  }

  if (defenseStatus === 'cancelled') {
    return (
      <div className="rounded-lg border border-muted bg-muted/30 p-5 text-sm text-muted-foreground">
        <strong>Defense cancelled.</strong> No scoring required.
      </div>
    );
  }

  // Count how many criteria have a value
  const scoredCount = Object.values(scoreState).filter(
    (s) => s.score !== null
  ).length;
  const totalCount = criteria.length;
  const canSubmit = !saving && !locked && scoredCount === totalCount;
  const canSaveDraft = !saving && !locked && scoredCount > 0;

  return (
    <div className="space-y-4">
      {locked && (
        <div className="rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success-foreground">
          Your scores have been submitted and are now locked.
        </div>
      )}

      {!locked && (
        <div className="rounded-md border border-info/30 bg-info/10 px-4 py-3 text-sm text-info-foreground">
          <strong>Drafts are private.</strong> You can save unfinished scores
          and return later. Once you click <em>Submit</em>, your scores become
          immutable and visible to the HoD.
        </div>
      )}

      <div className="space-y-3">
        {criteria.map((c) => (
          <CriterionRow
            key={c.id}
            criterion={c}
            score={scoreState[c.id]?.score ?? null}
            comment={scoreState[c.id]?.comment ?? ''}
            disabled={locked}
            onChange={(score, comment) => setScore(c.id, score, comment)}
          />
        ))}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {savedMessage && (
        <div className="rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success-foreground">
          {savedMessage}
        </div>
      )}

      {!locked && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">
            {scoredCount === totalCount
              ? 'All criteria scored. Ready to submit.'
              : `${scoredCount} of ${totalCount} criteria scored.`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => save(false)}
              disabled={!canSaveDraft}
              className={cn(
                'rounded-md border border-border bg-card px-4 py-2 text-sm font-medium transition',
                canSaveDraft
                  ? 'hover:bg-secondary'
                  : 'cursor-not-allowed opacity-50'
              )}
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={() => save(true)}
              disabled={!canSubmit}
              className={cn(
                'rounded-md px-5 py-2 text-sm font-medium transition',
                canSubmit
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'cursor-not-allowed bg-muted text-muted-foreground'
              )}
            >
              {saving ? 'Saving…' : 'Submit scores'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
