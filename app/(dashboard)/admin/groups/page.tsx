'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import {
  Plus, Trash2, Users, CheckCircle2, Clock,
  ChevronDown, ChevronUp, UserCheck, UserX, UserCircle,
  Upload, X, FileText, AlertCircle, CheckCheck, RefreshCw,
} from 'lucide-react';

type RosterEntry = {
  id: string;
  academic_year: number;
  group_number: number;
  leader_index: string;
  member_indexes: string[];
  is_claimed: boolean;
  created_at: string;
};

type StudentGroup = {
  id: string;
  group_number: number;
  academic_year: number;
  supervisor_id: string | null;
  supervisor?: { full_name: string } | null;
};

type Supervisor = {
  id: string;
  full_name: string;
  email: string;
  staff_id: string | null;
  is_active: boolean;
  department: { name: string } | null;
};

// ── Pending supervisor card ───────────────────────────────────
function SupervisorApprovalCard({
  sv,
  onAction,
}: {
  sv: Supervisor;
  onAction: (id: string, action: 'approve' | 'deactivate') => void;
}) {
  const [busy, setBusy] = useState(false);
  async function act(action: 'approve' | 'deactivate') {
    setBusy(true);
    await fetch(`/api/admin/supervisors/${sv.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    onAction(sv.id, action);
  }
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-muted-foreground">
          {sv.full_name.charAt(0).toUpperCase()}
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">{sv.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {sv.email}
            {sv.department ? ` · ${sv.department.name}` : ''}
            {sv.staff_id ? ` · ${sv.staff_id}` : ''}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {sv.is_active ? (
          <button
            disabled={busy}
            onClick={() => act('deactivate')}
            className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-60"
          >
            <UserX className="h-3.5 w-3.5" /> Deactivate
          </button>
        ) : (
          <button
            disabled={busy}
            onClick={() => act('approve')}
            className="flex items-center gap-1.5 rounded-lg bg-success/15 px-3 py-1.5 text-xs font-semibold text-success transition-colors hover:bg-success/25 disabled:opacity-60"
          >
            <UserCheck className="h-3.5 w-3.5" /> Approve
          </button>
        )}
      </div>
    </div>
  );
}

// ── Created group card with supervisor assignment ─────────────
function GroupCard({
  group,
  supervisors,
  onAssign,
}: {
  group: StudentGroup;
  supervisors: Supervisor[];
  onAssign: (groupId: string, supervisorId: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const approved = supervisors.filter((s) => s.is_active);

  async function handleAssign(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value || null;
    setBusy(true);
    const res = await fetch(`/api/admin/groups/${group.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supervisor_id: val }),
    });
    const json = await res.json();
    setBusy(false);
    if (json.ok) onAssign(group.id, val);
  }

  const current = approved.find((s) => s.id === group.supervisor_id);

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
          {group.group_number}
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Group {group.group_number}
          </p>
          <p className="text-xs text-muted-foreground">
            {group.academic_year}
            {current ? ` · Supervisor: ${current.full_name}` : ' · No supervisor assigned'}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <UserCircle className="h-4 w-4 text-muted-foreground" />
        <select
          value={group.supervisor_id ?? ''}
          onChange={handleAssign}
          disabled={busy || approved.length === 0}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        >
          <option value="">— Assign supervisor —</option>
          {approved.map((s) => (
            <option key={s.id} value={s.id}>{s.full_name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── Roster entry expandable card ─────────────────────────────
function RosterCard({ entry, onDelete }: { entry: RosterEntry; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Remove Group ${entry.group_number} from the roster?`)) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/groups/roster?id=${entry.id}`, { method: 'DELETE' });
    if ((await res.json()).ok) onDelete(entry.id);
    else setDeleting(false);
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
            {entry.group_number}
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Group {entry.group_number}
            </p>
            <p className="text-xs text-muted-foreground">
              {entry.member_indexes.length} member{entry.member_indexes.length !== 1 ? 's' : ''} &bull; Leader: {entry.leader_index}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {entry.is_claimed ? (
            <span className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
              <CheckCircle2 className="h-3 w-3" /> Active
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning-foreground">
              <Clock className="h-3 w-3" /> Pending
            </span>
          )}
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-5 pb-4 pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Members (first = leader)</p>
          <ol className="space-y-1">
            {entry.member_indexes.map((idx, i) => (
              <li key={idx} className="flex items-center gap-2 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-muted-foreground">{i + 1}</span>
                <span className="font-mono text-foreground">{idx}</span>
                {i === 0 && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Leader</span>}
              </li>
            ))}
          </ol>
          <div className="mt-4 border-t border-border pt-3">
            {entry.is_claimed ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                This group has been claimed by its leader and cannot be deleted.
              </p>
            ) : (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 text-xs text-destructive hover:underline disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleting ? 'Removing…' : 'Remove this group'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Bulk Upload Modal ─────────────────────────────────────────
type ParsedMember = { name: string; index: string; gender?: string | null };
type ParsedGroup = { group_number: number; members: ParsedMember[] };

function BulkUploadModal({
  onClose,
  onDone,
  defaultYear,
}: {
  onClose: () => void;
  onDone: (count: number) => void;
  defaultYear: number;
}) {
  const [step, setStep] = useState<'choose' | 'upload' | 'preview' | 'done'>('choose');
  const [uploadMode, setUploadMode] = useState<'auto' | 'preformed' | null>(null);
  const [year, setYear] = useState(defaultYear);
  const [file, setFile] = useState<File | null>(null);
  const [groups, setGroups] = useState<ParsedGroup[]>([]);
  const [hasGender, setHasGender] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);
  const [result, setResult] = useState<{ inserted: number; skipped: number; skippedGroups: number[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const yearOptions = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + i);

  async function handleParse() {
    if (!file || !uploadMode) return;
    setLoading(true); setError('');
    const fd = new FormData();
    fd.append('mode', 'parse');
    fd.append('upload_mode', uploadMode);
    fd.append('academic_year', String(year));
    fd.append('file', file);
    const res = await fetch('/api/admin/groups/bulk', { method: 'POST', body: fd });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) { setError(json.error); return; }
    setGroups(json.groups);
    setHasGender(json.hasGender ?? false);
    setTotalStudents(json.totalStudents);
    setStep('preview');
  }

  async function handleConfirm() {
    setLoading(true); setError('');
    const fd = new FormData();
    fd.append('mode', 'confirm');
    fd.append('upload_mode', uploadMode!);
    fd.append('academic_year', String(year));
    fd.append('groups', JSON.stringify(groups));
    const res = await fetch('/api/admin/groups/bulk', { method: 'POST', body: fd });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) { setError(json.error); return; }
    setResult(json);
    setStep('done');
    onDone(json.inserted);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Upload className="h-5 w-5 text-primary" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-foreground">Bulk Upload Groups</h2>
              <p className="text-xs text-muted-foreground">Upload a Word document (.docx)</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">

          {/* STEP: Choose mode */}
          {step === 'choose' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">How are the groups organised in the document?</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => { setUploadMode('auto'); setStep('upload'); }}
                  className="group rounded-xl border-2 border-border p-5 text-left transition-all hover:border-primary hover:bg-primary/5"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary group-hover:bg-primary/10">
                    <Users className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <p className="font-semibold text-foreground">Class list — auto-group</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Document has a full class list (Name + Index). System will group into 5s automatically with gender balance if a Gender column is present.
                  </p>
                </button>

                <button
                  onClick={() => { setUploadMode('preformed'); setStep('upload'); }}
                  className="group rounded-xl border-2 border-border p-5 text-left transition-all hover:border-primary hover:bg-primary/5"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary group-hover:bg-primary/10">
                    <FileText className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <p className="font-semibold text-foreground">Pre-formed groups (from rep)</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Document already has groups assigned by the course rep. Table must have: Group No, Student Name, Index Number columns.
                  </p>
                </button>
              </div>

              {/* Template hints */}
              <div className="rounded-xl border border-border bg-secondary/30 p-4 text-xs text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground">Expected document formats:</p>
                <div>
                  <p className="font-medium text-foreground">Auto-group (class list):</p>
                  <p>Table with columns: <code className="bg-secondary px-1 rounded">Student Name</code> | <code className="bg-secondary px-1 rounded">Index Number</code> | <code className="bg-secondary px-1 rounded">Gender</code> (optional, M/F)</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Pre-formed groups:</p>
                  <p>Table with columns: <code className="bg-secondary px-1 rounded">Group No</code> | <code className="bg-secondary px-1 rounded">Student Name</code> | <code className="bg-secondary px-1 rounded">Index Number</code> — first student per group = leader</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP: Upload file */}
          {step === 'upload' && (
            <div className="space-y-5">
              <button onClick={() => setStep('choose')} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                ← Back
              </button>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Graduation / Academic year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Upload document (.docx)</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-secondary/30 p-10 transition-colors hover:border-primary hover:bg-primary/5"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  {file ? (
                    <div className="text-center">
                      <p className="font-medium text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Click to select a .docx file</p>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleParse}
                disabled={!file || loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {loading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Parsing document…</> : 'Parse document →'}
              </button>
            </div>
          )}

          {/* STEP: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{groups.length} groups found</p>
                  <p className="text-xs text-muted-foreground">
                    {totalStudents} students · Year {year}
                    {uploadMode === 'auto' && !hasGender && ' · No gender column detected — grouped sequentially'}
                    {uploadMode === 'auto' && hasGender && ' · Gender-balanced grouping applied'}
                  </p>
                </div>
                <button onClick={() => setStep('upload')} className="text-xs text-muted-foreground hover:text-foreground">
                  ← Re-upload
                </button>
              </div>

              {!hasGender && uploadMode === 'auto' && (
                <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs text-warning-foreground">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  No Gender column found — groups are sequential. Add a Gender column (M/F) to the document for gender-balanced grouping.
                </div>
              )}

              <div className="space-y-2 rounded-xl border border-border bg-secondary/30 p-3 max-h-72 overflow-y-auto">
                {groups.map((grp) => (
                  <div key={grp.group_number} className="rounded-lg border border-border bg-card p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        {grp.group_number}
                      </span>
                      <p className="text-xs font-semibold text-foreground">Group {grp.group_number}</p>
                      <span className="text-[10px] text-muted-foreground">({grp.members.length} members)</span>
                    </div>
                    <ol className="space-y-0.5">
                      {grp.members.map((m, i) => (
                        <li key={m.index} className="flex items-center gap-2 text-xs">
                          <span className="w-3 shrink-0 text-muted-foreground">{i + 1}.</span>
                          <span className="font-mono text-foreground">{m.index}</span>
                          <span className="text-muted-foreground truncate">{m.name}</span>
                          {i === 0 && <span className="ml-auto shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">LEADER</span>}
                          {m.gender && <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${m.gender === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>{m.gender}</span>}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleConfirm}
                disabled={loading || groups.length === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {loading
                  ? <><RefreshCw className="h-4 w-4 animate-spin" /> Saving groups…</>
                  : `Confirm & save ${groups.length} groups →`}
              </button>
            </div>
          )}

          {/* STEP: Done */}
          {step === 'done' && result && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
                <CheckCheck className="h-8 w-8 text-success" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">{result.inserted} groups uploaded</p>
                {result.skipped > 0 && (
                  <p className="mt-1 text-sm text-warning-foreground">
                    {result.skipped} group(s) skipped (already exist): {result.skippedGroups.join(', ')}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Group leaders who have already registered have been notified.
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function AdminGroupsPage() {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'roster' | 'groups' | 'supervisors'>('supervisors');
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Form state
  const [year, setYear] = useState(new Date().getFullYear() + 4);
  const [groupNum, setGroupNum] = useState('');
  const [membersText, setMembersText] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/groups/roster').then((r) => r.json()),
      fetch('/api/admin/groups/created').then((r) => r.json()),
      fetch('/api/admin/supervisors').then((r) => r.json()),
    ]).then(([r, g, s]) => {
      if (r.ok) setRoster(r.data);
      if (g.ok) setGroups(g.data);
      if (s.ok) setSupervisors(s.data);
    }).finally(() => setLoading(false));
  }, []);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    const lines = membersText.split('\n').map((l) => l.trim().toUpperCase()).filter(Boolean);
    if (lines.length === 0) { setError('Enter at least one member index number'); return; }
    if (lines.length > 5) { setError('Maximum 5 members per group'); return; }

    startTransition(async () => {
      const res = await fetch('/api/admin/groups/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academic_year: year, group_number: parseInt(groupNum), member_indexes: lines }),
      });
      const json = await res.json();
      if (!json.ok) { setError(json.error); return; }
      setRoster((prev) => [json.data, ...prev]);
      setSuccess(`Group ${groupNum} added`);
      setGroupNum(''); setMembersText('');
    });
  }

  async function handleDelete(id: string) {
    setRoster((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleDeleteYear(year: number) {
    const unclaimed = roster.filter((r) => r.academic_year === year && !r.is_claimed);
    if (unclaimed.length === 0) return;
    if (!confirm(`Delete all ${unclaimed.length} unclaimed group(s) for ${year}? Claimed groups (already active) will not be affected.`)) return;
    const res = await fetch(`/api/admin/groups/roster?year=${year}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.ok) setRoster((prev) => prev.filter((r) => !(r.academic_year === year && !r.is_claimed)));
  }

  function handleSupervisorAction(id: string, action: 'approve' | 'deactivate') {
    setSupervisors((prev) =>
      prev.map((s) => s.id === id ? { ...s, is_active: action === 'approve' } : s)
    );
  }

  function handleAssign(groupId: string, supervisorId: string | null) {
    setGroups((prev) =>
      prev.map((g) => g.id === groupId ? { ...g, supervisor_id: supervisorId } : g)
    );
  }

  const pending = supervisors.filter((s) => !s.is_active);
  const approved = supervisors.filter((s) => s.is_active);
  const yearOptions = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + i);

  const tabs = [
    { key: 'supervisors', label: 'Supervisors', badge: supervisors.length },
    { key: 'groups', label: 'Created Groups', badge: groups.length },
    { key: 'roster', label: 'Roster', badge: roster.length },
  ] as const;

  return (
    <div className="space-y-6 p-6">
      {showBulkModal && (
        <BulkUploadModal
          defaultYear={year}
          onClose={() => setShowBulkModal(false)}
          onDone={(count) => {
            // Refresh roster list after bulk upload
            fetch('/api/admin/groups/roster').then((r) => r.json()).then((r) => {
              if (r.ok) setRoster(r.data);
            });
            setActiveTab('roster');
          }}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Groups &amp; Supervisors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Approve supervisors, upload group rosters, and assign supervisors to groups.
          </p>
        </div>
        <button
          onClick={() => setShowBulkModal(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Upload className="h-4 w-4" />
          Bulk Upload
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-secondary/40 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === t.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {t.badge > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                t.key === 'supervisors' && pending.length > 0
                  ? 'bg-warning/20 text-warning-foreground'
                  : 'bg-secondary text-muted-foreground'
              }`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          {/* ── Tab: Supervisors ── */}
          {activeTab === 'supervisors' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Supervisors are automatically active when they register. You can deactivate an account if a lecturer is no longer available.
              </p>
              {supervisors.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-10 text-center">
                  <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No supervisors registered yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {supervisors.map((sv) => (
                    <SupervisorApprovalCard key={sv.id} sv={sv} onAction={handleSupervisorAction} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Created Groups ── */}
          {activeTab === 'groups' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                These are groups already created by group leaders. Assign a supervisor to each.
              </p>
              {groups.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-10 text-center">
                  <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No groups created yet.</p>
                </div>
              ) : (
                groups.map((g) => (
                  <GroupCard key={g.id} group={g} supervisors={supervisors} onAssign={handleAssign} />
                ))
              )}
            </div>
          )}

          {/* ── Tab: Roster ── */}
          {activeTab === 'roster' && (
            <div className="space-y-6">
              {/* Add form */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                <div className="mb-5 flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-semibold">Add a group</h2>
                </div>
                <form onSubmit={handleAdd} className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Graduation year</label>
                    <select
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Group number</label>
                    <input
                      type="number" min={1} value={groupNum}
                      onChange={(e) => setGroupNum(e.target.value)}
                      placeholder="e.g. 10" required
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-medium">
                      Member index numbers{' '}
                      <span className="font-normal text-muted-foreground">(one per line, max 5 — first line = leader)</span>
                    </label>
                    <textarea
                      rows={5} value={membersText} onChange={(e) => setMembersText(e.target.value)}
                      placeholder={`FOE.41.008.001.22\nFOE.41.008.002.22\nFOE.41.008.003.22`}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  {error && <p className="sm:col-span-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
                  {success && <p className="sm:col-span-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">{success}</p>}
                  <div className="sm:col-span-2">
                    <button
                      type="submit" disabled={isPending}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
                    >
                      <Plus className="h-4 w-4" />
                      {isPending ? 'Adding…' : 'Add group'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Roster list — grouped by academic year */}
              {roster.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-10 text-center">
                  <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No groups uploaded yet.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {Array.from(new Set(roster.map((r) => r.academic_year)))
                    .sort((a, b) => b - a)
                    .map((yr) => {
                      const yearEntries = roster.filter((r) => r.academic_year === yr);
                      const unclaimed = yearEntries.filter((r) => !r.is_claimed);
                      const claimed = yearEntries.filter((r) => r.is_claimed);
                      return (
                        <div key={yr}>
                          {/* Year header */}
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <h3 className="text-sm font-semibold text-foreground">
                                {yr} Cohort
                              </h3>
                              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {yearEntries.length} group{yearEntries.length !== 1 ? 's' : ''}
                              </span>
                              {claimed.length > 0 && (
                                <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                                  <CheckCircle2 className="h-2.5 w-2.5" /> {claimed.length} active
                                </span>
                              )}
                              {unclaimed.length > 0 && (
                                <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning-foreground">
                                  <Clock className="h-2.5 w-2.5" /> {unclaimed.length} pending
                                </span>
                              )}
                            </div>
                            {unclaimed.length > 0 && (
                              <button
                                onClick={() => handleDeleteYear(yr)}
                                className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete {unclaimed.length} pending
                              </button>
                            )}
                          </div>
                          <div className="space-y-2">
                            {yearEntries.map((entry) => (
                              <RosterCard key={entry.id} entry={entry} onDelete={handleDelete} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
