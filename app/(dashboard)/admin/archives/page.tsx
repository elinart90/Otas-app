'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader, EmptyCard } from '@/components/layout/dashboard-bits';
import { cn } from '@/lib/utils';

type MemberRow = { role_in_team: string; user: { full_name: string } | null };

type Project = {
  id: string;
  title: string;
  status: 'final_passed' | 'archived';
  academic_year: number;
  group_id: string | null;
  author: { full_name: string } | null;
  members: MemberRow | MemberRow[] | null;
  archives: Array<{ id: string; archive_code: string; document_url: string }>;
};

function projectAuthorLabel(p: Project): string {
  const rows: MemberRow[] = Array.isArray(p.members)
    ? p.members
    : p.members ? [p.members] : [];
  const names = rows
    .sort((a, b) => (a.role_in_team === 'lead' ? -1 : b.role_in_team === 'lead' ? 1 : 0))
    .map((r) => r.user?.full_name)
    .filter(Boolean) as string[];
  if (names.length > 0) {
    return names.length <= 2 ? names.join(', ') : `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
  }
  return p.author?.full_name ?? 'Unknown';
}

export default function AdminArchivesPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [archiveCode, setArchiveCode] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/archive/upload');
      const data = await res.json();
      if (data.ok) setProjects(data.projects);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startUpload(p: Project) {
  setSelectedProjectId(p.id);
  setArchiveCode(p.archives[0]?.archive_code ?? `ARC-${p.academic_year}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`);
  setFile(null);
  setError(null);
  setSuccess(null);
  // Scroll the upload panel into view after React commits the render
  setTimeout(() => {
    document.getElementById('upload-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
}

  async function submitUpload() {
    if (!selectedProjectId || !file || !archiveCode) return;
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const fd = new FormData();
      fd.append(
        'meta',
        JSON.stringify({ project_id: selectedProjectId, archive_code: archiveCode.trim() })
      );
      fd.append('file', file);
      const res = await fetch('/api/archive/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? 'Upload failed');
        return;
      }
      setSuccess(`Uploaded as ${data.archive_code}. Project is now archived.`);
      setSelectedProjectId(null);
      setFile(null);
      setArchiveCode('');
      await load();
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Network error');
    } finally {
      setUploading(false);
    }
  }

  const passed = projects.filter((p) => p.status === 'final_passed');
  const archived = projects.filter((p) => p.status === 'archived');

  return (
    <>
      <PageHeader
        title="Archive management"
        subtitle="Upload finalised project PDFs to the institutional archive."
      />

      {success && (
        <div className="mb-4 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success-foreground">
          {success}
        </div>
      )}

      <div className="space-y-6">
        {loading ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : (
          <>
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                Ready to archive ({passed.length})
              </h2>
              {passed.length === 0 ? (
                <EmptyCard
                  title="No projects awaiting archive"
                  body="Projects appear here once they pass their final defense."
                />
              ) : (
                <div className="space-y-3">
                  {passed.map((p) => (
                    <ProjectRow
                      key={p.id}
                      project={p}
                      isSelected={selectedProjectId === p.id}
                      onStart={() => startUpload(p)}
                    />
                  ))}
                </div>
              )}
            </section>

            {archived.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                  Already archived ({archived.length})
                </h2>
                <div className="space-y-3">
                  {archived.map((p) => (
                    <ProjectRow
                      key={p.id}
                      project={p}
                      isSelected={selectedProjectId === p.id}
                      onStart={() => startUpload(p)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Upload modal-ish panel */}
        {selectedProjectId && (
          <section id="upload-panel" className="rounded-lg border border-primary/30 bg-primary-muted p-5">
            <h3 className="text-sm font-semibold text-foreground">
              Upload archive document
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              The PDF will be stored in the private archives bucket. Students
              and faculty will view it through the read-only viewer.
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
                  PDF file
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
                  setSelectedProjectId(null);
                  setFile(null);
                  setArchiveCode('');
                  setError(null);
                }}
                disabled={uploading}
                className="rounded-md border border-border bg-card px-4 py-2 text-sm hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitUpload}
                disabled={uploading || !file || !archiveCode.trim()}
                className={cn(
                  'rounded-md px-5 py-2 text-sm font-medium transition',
                  uploading || !file || !archiveCode.trim()
                    ? 'cursor-not-allowed bg-muted text-muted-foreground'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                {uploading ? 'Uploading…' : 'Upload to archive'}
              </button>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function ProjectRow({
  project,
  isSelected,
  onStart,
}: {
  project: Project;
  isSelected: boolean;
  onStart: () => void;
}) {
  const hasDoc =
    !!project.archives?.[0]?.document_url &&
    !project.archives[0].document_url.startsWith('placeholder://');
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border bg-card p-4 transition-colors',
        isSelected ? 'border-primary' : 'border-border'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {project.title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {project.academic_year} · {projectAuthorLabel(project)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {hasDoc && (
          <Link
            href={`/archive/${project.id}`}
            target="_blank"
            className="text-xs text-primary hover:underline"
          >
            View
          </Link>
        )}
        <button
          type="button"
          onClick={onStart}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary"
        >
          {hasDoc ? 'Replace PDF' : 'Upload PDF'}
        </button>
      </div>
    </div>
  );
}
