'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { PanelPicker, type Panelist } from './panel-picker';
import { DEFENSE_STAGES, STAGE_LABEL, type DefenseStage } from '@/lib/defense/schema';

type EligibleProject = {
  id: string;
  title: string;
  status: string;
  supervisor: { full_name: string } | null;
  author: { full_name: string; index_number: string | null } | null;
};

export function DefenseForm() {
  const router = useRouter();
  const [stage, setStage] = useState<DefenseStage>('synopsis');
  const [projects, setProjects] = useState<EligibleProject[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [venue, setVenue] = useState('');
  const [panelists, setPanelists] = useState<Panelist[]>([]);
  const [selectedPanelistIds, setSelectedPanelistIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load eligible projects when stage changes
  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/defense/eligible-projects?stage=${stage}`);
      const data = await res.json();
      if (data.ok) setProjects(data.projects);
      setProjectId('');
      setSelectedPanelistIds([]);
    })();
  }, [stage]);

  // Reload panelists when project changes (to exclude its supervisor)
  useEffect(() => {
    if (!projectId) {
      setPanelists([]);
      return;
    }
    (async () => {
      const res = await fetch(`/api/defense/panelists?projectId=${projectId}`);
      const data = await res.json();
      if (data.ok) setPanelists(data.panelists);
      // Drop any selected panelists that may have been the just-excluded supervisor
      setSelectedPanelistIds((prev) =>
        prev.filter((id) =>
          (data.panelists as Panelist[]).some((p) => p.id === id)
        )
      );
    })();
  }, [projectId]);

  const canSubmit =
    !submitting &&
    projectId &&
    scheduledAt &&
    venue.trim().length >= 2 &&
    selectedPanelistIds.length >= 2 &&
    selectedPanelistIds.length <= 4;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/defense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          stage,
          scheduled_at: new Date(scheduledAt).toISOString(),
          venue: venue.trim(),
          panelist_ids: selectedPanelistIds,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? 'Failed to schedule defense');
        return;
      }
      router.push('/hod/overview');
    } catch (e: any) {
      setError(e?.message ?? 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Stage */}
      <div className="rounded-lg border border-border bg-card p-5">
        <label className="block text-sm font-medium text-foreground">
          Defense stage
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {DEFENSE_STAGES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStage(s)}
              className={cn(
                'rounded-md border px-4 py-3 text-sm transition-colors',
                stage === s
                  ? 'border-primary bg-primary-muted text-primary font-medium'
                  : 'border-border bg-background text-muted-foreground hover:bg-secondary'
              )}
            >
              {STAGE_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Project */}
      <div className="rounded-lg border border-border bg-card p-5">
        <label className="block text-sm font-medium text-foreground">
          Project
        </label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {stage === 'synopsis'
            ? 'Eligible projects: those currently in supervision.'
            : 'Eligible projects: those that have passed synopsis or are in supervision.'}
        </p>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">— Select project —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
              {p.author?.full_name ? ` — ${p.author.full_name}` : ''}
            </option>
          ))}
        </select>
        {projects.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            No projects are eligible for {stage} defense right now.
          </p>
        )}
      </div>

      {/* Date / venue */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <label className="block text-sm font-medium text-foreground">
            Date &amp; time
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <label className="block text-sm font-medium text-foreground">
            Venue
          </label>
          <input
            type="text"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            maxLength={200}
            placeholder="e.g. CSE Conference Room, UMaT"
            className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Panel */}
      <div className="rounded-lg border border-border bg-card p-5">
        <label className="block text-sm font-medium text-foreground">
          Panel members
        </label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {projectId
            ? 'The project supervisor is automatically excluded from this list.'
            : 'Select a project first to load eligible panelists.'}
        </p>
        <div className="mt-3">
          <PanelPicker
            panelists={panelists}
            selected={selectedPanelistIds}
            onChange={setSelectedPanelistIds}
            disabled={!projectId}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-5">
        <div className="text-xs text-muted-foreground">
          Panel members will see this defense in their assignments.
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
          {submitting ? 'Scheduling…' : 'Schedule defense'}
        </button>
      </div>
    </form>
  );
}
