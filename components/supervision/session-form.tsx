'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  SUPERVISION_OUTCOMES,
  OUTCOME_LABEL,
  type SupervisionOutcome,
} from '@/lib/supervision/schema';

type Project = { id: string; title: string; status: string };

export function SessionForm({
  preselectProjectId,
}: {
  preselectProjectId?: string;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>(preselectProjectId ?? '');
  const [sessionDate, setSessionDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [agenda, setAgenda] = useState('');
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState<SupervisionOutcome>('on_track');
  const [nextSteps, setNextSteps] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load supervisor's approved/active projects
  useEffect(() => {
    (async () => {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (!data.ok) return;
      const allowed = new Set([
        'proposal_approved',
        'in_supervision',
        'synopsis_scheduled',
        'synopsis_passed',
        'final_scheduled',
      ]);
      setProjects(
        (data.projects ?? []).filter((p: Project) => allowed.has(p.status))
      );
    })();
  }, []);

  const canSubmit =
    !submitting &&
    projectId &&
    sessionDate &&
    agenda.trim().length >= 5;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append(
        'meta',
        JSON.stringify({
          project_id: projectId,
          session_date: new Date(sessionDate).toISOString(),
          agenda: agenda.trim(),
          notes: notes.trim() || null,
          outcome,
          next_steps: nextSteps.trim() || null,
        })
      );
      if (file) fd.append('file', file);

      const res = await fetch('/api/supervision', { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? 'Failed to log session');
        return;
      }
      router.push('/supervisor/supervision');
    } catch (e: any) {
      setError(e?.message ?? 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Project + date */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <label className="block text-sm font-medium text-foreground">
            Project
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">— Select project —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          {projects.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              No approved projects yet. Sessions can only be logged on approved
              projects.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <label className="block text-sm font-medium text-foreground">
            Session date
          </label>
          <input
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Agenda */}
      <div className="rounded-lg border border-border bg-card p-5">
        <label className="block text-sm font-medium text-foreground">
          Agenda
        </label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          What was discussed in this session.
        </p>
        <input
          type="text"
          value={agenda}
          onChange={(e) => setAgenda(e.target.value)}
          maxLength={500}
          placeholder="e.g. Reviewed Chapter 2 literature review"
          className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Notes */}
      <div className="rounded-lg border border-border bg-card p-5">
        <label className="block text-sm font-medium text-foreground">
          Session notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          maxLength={5000}
          placeholder="Detailed observations, decisions, points raised…"
          className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums">
          {notes.length} / 5000
        </p>
      </div>

      {/* Outcome + next steps */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <label className="block text-sm font-medium text-foreground">
            Outcome
          </label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Your overall assessment of this session.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {SUPERVISION_OUTCOMES.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOutcome(o)}
                className={cn(
                  'rounded-md border px-3 py-2 text-sm transition-colors',
                  outcome === o
                    ? 'border-primary bg-primary-muted text-primary font-medium'
                    : 'border-border bg-background text-muted-foreground hover:bg-secondary'
                )}
              >
                {OUTCOME_LABEL[o]}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <label className="block text-sm font-medium text-foreground">
            Next steps (optional)
          </label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            What the student should do before the next session.
          </p>
          <textarea
            value={nextSteps}
            onChange={(e) => setNextSteps(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="e.g. Complete the methodology chapter draft…"
            className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Attachment */}
      <div className="rounded-lg border border-border bg-card p-5">
        <label className="block text-sm font-medium text-foreground">
          Attachment (optional)
        </label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Optionally attach a file referenced in this session. Max 10 MB.
        </p>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-3 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:text-foreground hover:file:bg-secondary"
        />
        {file && (
          <p className="mt-2 text-xs text-muted-foreground">
            Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-5">
        <div className="text-xs text-muted-foreground">
          The student will see this session in their supervision history.
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          className={cn(
            'rounded-md px-5 py-2.5 text-sm font-medium transition',
            canSubmit
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'cursor-not-allowed bg-muted text-muted-foreground'
          )}
        >
          {submitting ? 'Saving…' : 'Log session'}
        </button>
      </div>
    </form>
  );
}
