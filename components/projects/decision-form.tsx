'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DecisionForm({
  projectId,
  title = 'Supervisor decision',
}: {
  projectId: string;
  title?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'rejecting'>('idle');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(decision: 'approve' | 'reject') {
    setSubmitting(true);
    setError(null);
    try {
      const body =
        decision === 'approve'
          ? { decision: 'approve' }
          : { decision: 'reject', reason: reason.trim() };

      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? 'Decision failed');
        return;
      }
      router.refresh();
      setMode('idle');
      setReason('');
    } catch (e: any) {
      setError(e?.message ?? 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === 'rejecting') {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
        <h3 className="text-sm font-semibold text-foreground">Reject proposal</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Provide a clear reason. The student will see this and can revise.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          minLength={20}
          placeholder="e.g. The scope is too broad — please narrow to a specific use case…"
          className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {error && (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        )}
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setMode('idle')}
            disabled={submitting}
            className="rounded-md border border-border bg-card px-4 py-2 text-sm hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => submit('reject')}
            disabled={submitting || reason.trim().length < 20}
            className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Sending…' : 'Confirm rejection'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Approve or reject this proposal. Rejecting requires a reason.
      </p>
      {error && (
        <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => submit('approve')}
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? 'Approving…' : 'Approve'}
        </button>
        <button
          type="button"
          onClick={() => setMode('rejecting')}
          disabled={submitting}
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
