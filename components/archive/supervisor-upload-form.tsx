'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function SupervisorArchiveUpload({
  projectId,
  academicYear,
  defaultCode,
}: {
  projectId: string;
  academicYear: number;
  defaultCode?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [archiveCode, setArchiveCode] = useState(
    defaultCode ??
      `ARC-${academicYear}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`
  );
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit() {
    if (!file || !archiveCode.trim()) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const fd = new FormData();
      fd.append(
        'meta',
        JSON.stringify({ project_id: projectId, archive_code: archiveCode.trim() })
      );
      fd.append('file', file);
      const res = await fetch('/api/archive/supervisor-upload', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? 'Upload failed');
        return;
      }
      setSuccess(
        `Archived as ${data.archive_code}. The project is now in the institutional archive.`
      );
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  if (success && !open) {
    return (
      <section className="rounded-lg border border-success/30 bg-success/10 p-5">
        <p className="text-sm font-semibold text-foreground">Archived</p>
        <p className="mt-1 text-xs text-muted-foreground">{success}</p>
      </section>
    );
  }

  if (!open) {
    return (
      <section className="rounded-lg border border-primary/30 bg-primary-muted p-5">
        <h3 className="text-sm font-semibold text-foreground">
          Ready for archive
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          This project has passed its final defense. As the supervisor, you can
          submit the final bound PDF to the institutional archive.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Submit final PDF to archive
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-primary/30 bg-primary-muted p-5">
      <h3 className="text-sm font-semibold text-foreground">
        Submit to institutional archive
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Upload the final approved PDF. This action cannot be undone by you —
        contact the department administrator if a replacement is needed.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-foreground">
            Archive code
          </label>
          <input
            type="text"
            value={archiveCode}
            onChange={(e) => setArchiveCode(e.target.value)}
            placeholder="e.g. ARC-2026-001"
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground">
            Final PDF
          </label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-2 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:text-foreground hover:file:bg-secondary"
          />
          {file && (
            <p className="mt-1 text-xs text-muted-foreground">
              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={submitting}
          className="rounded-md border border-border bg-card px-4 py-2 text-sm hover:bg-secondary"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={submitting || !file || !archiveCode.trim()}
          className={cn(
            'rounded-md px-5 py-2 text-sm font-medium transition',
            submitting || !file || !archiveCode.trim()
              ? 'cursor-not-allowed bg-muted text-muted-foreground'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          {submitting ? 'Submitting…' : 'Submit to archive'}
        </button>
      </div>
    </section>
  );
}
