'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UserCircle, AlertCircle } from 'lucide-react';
import type { TitleCheckResponse } from '@/app/api/similarity/title/route';

const TITLE_DEBOUNCE = 500;
const MIN_TITLE_LENGTH = 10;
const BLOCK_THRESHOLD = 0.75;

type AssignedSupervisor = { id: string; full_name: string; email: string } | null;
type Programme = {
  id: string;
  name: string;
  code: string;
  departments: { name: string } | null;
};

type TitleStatus =
  | { kind: 'idle' }
  | { kind: 'typing' }
  | { kind: 'checking' }
  | {
      kind: 'result';
      score: number;
      band: 'original' | 'review' | 'duplicate';
      topMatch: string | null;
    }
  | { kind: 'error'; message: string };

export function ProposalForm() {
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear());
  const [programmeId, setProgrammeId] = useState<string>('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Assigned supervisor (from group) + programmes + leader gate
  const [supervisor, setSupervisor] = useState<AssignedSupervisor>(undefined as unknown as AssignedSupervisor);
  const [supervisorLoading, setSupervisorLoading] = useState(true);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [isLeader, setIsLeader] = useState<boolean | null>(null);

  // Async states
  const [titleStatus, setTitleStatus] = useState<TitleStatus>({ kind: 'idle' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load assigned supervisor from group + student's programme
  useEffect(() => {
    (async () => {
      const [groupRes, pRes] = await Promise.all([
        fetch('/api/student/groups').then((r) => r.json()),
        fetch('/api/projects/programmes').then((r) => r.json()),
      ]);

      // Extract supervisor + leader status from the student's group
      if (groupRes.ok && groupRes.data) {
        setIsLeader(groupRes.data.isLeader === true);
        const supId = groupRes.data.membership?.student_groups?.supervisor_id;
        if (supId) {
          const svRes = await fetch(`/api/projects/supervisors?id=${supId}`).then((r) => r.json());
          setSupervisor(svRes.ok ? svRes.supervisor : null);
        } else {
          setSupervisor(null);
        }
      } else {
        setIsLeader(false);
        setSupervisor(null);
      }
      setSupervisorLoading(false);

      if (pRes.ok) {
        setProgrammes(pRes.programmes);
        if (pRes.userProgrammeId) setProgrammeId(pRes.userProgrammeId);
      }
    })();
  }, []);

  // Live title check
  useEffect(() => {
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    if (title.trim().length < MIN_TITLE_LENGTH) {
      setTitleStatus({ kind: 'idle' });
      return;
    }
    setTitleStatus({ kind: 'typing' });
    titleDebounceRef.current = setTimeout(async () => {
      setTitleStatus({ kind: 'checking' });
      try {
        const res = await fetch('/api/similarity/title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, persist: false }),
        });
        const data = (await res.json()) as TitleCheckResponse;
        if (!data.ok) { setTitleStatus({ kind: 'error', message: data.error }); return; }
        setTitleStatus({
          kind: 'result',
          score: data.result.highestScore,
          band: data.result.band,
          topMatch: data.result.matches[0]?.title ?? null,
        });
      } catch (e: any) {
        setTitleStatus({ kind: 'error', message: e?.message ?? 'Network error' });
      }
    }, TITLE_DEBOUNCE);
    return () => { if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current); };
  }, [title]);

  function addKeyword() {
    const t = keywordInput.trim();
    if (!t || keywords.includes(t) || keywords.length >= 8) return;
    setKeywords([...keywords, t]);
    setKeywordInput('');
  }
  function removeKeyword(k: string) { setKeywords(keywords.filter((x) => x !== k)); }

  const titleBlocked = titleStatus.kind === 'result' && titleStatus.score >= BLOCK_THRESHOLD;
  const canSubmit =
    !submitting &&
    isLeader === true &&
    title.trim().length >= MIN_TITLE_LENGTH &&
    abstract.trim().length >= 50 &&
    keywords.length >= 2 &&
    !!supervisor &&
    programmeId &&
    !titleBlocked;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !supervisor) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('meta', JSON.stringify({
        title: title.trim(),
        abstract: abstract.trim(),
        keywords,
        academic_year: academicYear,
        supervisor_id: supervisor.id,
        programme_id: programmeId,
      }));
      if (pdfFile) fd.append('file', pdfFile);
      const res = await fetch('/api/projects', { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.ok) { setSubmitError(data.error ?? 'Submission failed'); return; }
      router.push('/student/project');
    } catch (e: any) {
      setSubmitError(e?.message ?? 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLeader === false) {
    return (
      <div className="rounded-lg border border-warning/30 bg-warning/10 px-5 py-4">
        <p className="text-sm font-semibold text-warning-foreground">Only the group leader can submit the proposal</p>
        <p className="mt-1 text-xs text-warning-foreground/80">
          Your group leader will submit the proposal on behalf of the entire group. All members will be automatically added to the project.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Title */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-card">
        <label className="block text-sm font-medium text-foreground">Project title</label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Checked against the archive in real time. Titles above 75% similarity are blocked.
        </p>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. AI-Driven Soil Moisture Monitoring for Smallholder Farms in Tarkwa"
          maxLength={300}
          className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <TitleStatusBanner status={titleStatus} />
      </div>

      {/* Abstract */}
      <div className="rounded-lg border border-border bg-card p-5">
        <label className="block text-sm font-medium text-foreground">Abstract</label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Briefly describe the problem, your proposed approach, and expected outcomes.
        </p>
        <textarea
          value={abstract}
          onChange={(e) => setAbstract(e.target.value)}
          rows={7}
          maxLength={5000}
          placeholder="The proposed system aims to…"
          className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums">
          {abstract.length} / 5000
        </p>
      </div>

      {/* Keywords */}
      <div className="rounded-lg border border-border bg-card p-5">
        <label className="block text-sm font-medium text-foreground">Keywords</label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          2–8 keywords. Press Enter or comma to add.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {keywords.map((k) => (
            <span key={k} className="inline-flex items-center gap-1 rounded-full bg-primary-muted px-2.5 py-1 text-xs font-medium text-primary">
              {k}
              <button type="button" onClick={() => removeKeyword(k)} className="ml-1 text-primary/70 hover:text-primary">×</button>
            </span>
          ))}
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addKeyword(); } }}
            placeholder={keywords.length === 0 ? 'machine learning, agriculture, IoT…' : ''}
            className="min-w-[10rem] flex-1 border-none bg-transparent px-2 py-1 text-sm focus:outline-none"
          />
        </div>
      </div>

      {/* Assigned supervisor (read-only) + Programme */}
      <div className="grid gap-4 md:grid-cols-2">

        {/* Supervisor — assigned by admin, not selectable */}
        <div className="rounded-lg border border-border bg-card p-5">
          <label className="block text-sm font-medium text-foreground">Assigned supervisor</label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Set by your department. Contact admin if this is incorrect.
          </p>
          <div className="mt-3">
            {supervisorLoading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : supervisor ? (
              <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/5 px-4 py-3">
                <UserCircle className="h-5 w-5 shrink-0 text-success" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{supervisor.full_name}</p>
                  <p className="text-xs text-muted-foreground">{supervisor.email}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
                <p className="text-xs text-warning-foreground">
                  No supervisor has been assigned to your group yet. Contact your department admin.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Programme */}
        <div className="rounded-lg border border-border bg-card p-5">
          <label className="block text-sm font-medium text-foreground">Programme</label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            The academic programme under which this project will be archived.
          </p>
          <select
            value={programmeId}
            onChange={(e) => setProgrammeId(e.target.value)}
            className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">— Select programme —</option>
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}{p.departments?.name ? ` — ${p.departments.name}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Academic year + optional PDF */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <label className="block text-sm font-medium text-foreground">Academic year</label>
          <input
            type="number"
            value={academicYear}
            min={2020}
            max={2099}
            onChange={(e) => setAcademicYear(parseInt(e.target.value || '0', 10))}
            className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <label className="block text-sm font-medium text-foreground">
            Proposal document <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <p className="mt-0.5 text-xs text-muted-foreground">Attach a PDF draft. Max 15 MB.</p>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
            className="mt-3 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:text-foreground hover:file:bg-secondary"
          />
          {pdfFile && (
            <p className="mt-2 text-xs text-muted-foreground">
              Selected: {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(1)} MB)
            </p>
          )}
        </div>
      </div>

      {submitError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-5">
        <div className="text-xs text-muted-foreground">
          {titleBlocked ? (
            <span className="text-destructive">Title too similar to an existing project. Revise before submitting.</span>
          ) : !supervisor ? (
            <span className="text-warning-foreground">Waiting for supervisor assignment before you can submit.</span>
          ) : isLeader !== true ? (
            <span className="text-warning-foreground">Loading group status…</span>
          ) : (
            'Once submitted, your supervisor will review and approve or reject the proposal. All group members are added automatically.'
          )}
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
          {submitting ? 'Submitting…' : 'Submit proposal'}
        </button>
      </div>
    </form>
  );
}

function TitleStatusBanner({ status }: { status: TitleStatus }) {
  if (status.kind === 'idle') return null;
  if (status.kind === 'typing') return <p className="mt-3 text-xs text-muted-foreground">Waiting for you to stop typing…</p>;
  if (status.kind === 'checking') return <p className="mt-3 text-xs text-muted-foreground">Checking against archive…</p>;
  if (status.kind === 'error') return (
    <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{status.message}</p>
  );
  const pct = Math.round(status.score * 100);
  const tone = status.band === 'original' ? 'success' : status.band === 'review' ? 'warning' : 'destructive';
  const label = status.band === 'original' ? 'Distinct title' : status.band === 'review' ? 'Review related work' : 'Too similar — please revise';
  return (
    <div className={cn(
      'mt-3 flex items-center justify-between rounded-md border px-3 py-2 text-xs',
      tone === 'success' && 'border-success/30 bg-success/10',
      tone === 'warning' && 'border-warning/40 bg-warning/15',
      tone === 'destructive' && 'border-destructive/30 bg-destructive/10'
    )}>
      <span>
        <strong>{label}</strong>
        {status.topMatch && <span className="text-muted-foreground"> · Closest: "{status.topMatch}"</span>}
      </span>
      <span className="tabular-nums font-medium">{pct}%</span>
    </div>
  );
}
