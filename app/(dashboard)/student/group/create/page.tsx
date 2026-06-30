'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, CheckCircle2, UserCircle, ChevronDown, ArrowRight } from 'lucide-react';

type MemberDetail = {
  index_number: string;
  full_name: string | null;
  registered: boolean;
  is_leader: boolean;
};

type AvailableGroup = { id: string; group_number: number };

type AvailableData = {
  myRoster: {
    id: string;
    group_number: number;
    academic_year: number;
    leader_index: string;
    member_indexes: string[];
  } | null;
  available: AvailableGroup[];
  memberDetails: MemberDetail[] | null;
  graduationYear: number;
};

export default function CreateGroupPage() {
  const router = useRouter();
  const [data, setData] = useState<AvailableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedGroupNum, setSelectedGroupNum] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/student/groups/available')
      .then((r) => r.json())
      .then((json) => { if (json.ok) setData(json.data); })
      .finally(() => setLoading(false));
  }, []);

  function handleSelectGroup(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setSelectedGroupId(id);
    const found = data?.available.find((g) => g.id === id);
    setSelectedGroupNum(found?.group_number ?? null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data?.myRoster || !selectedGroupId || !selectedGroupNum) return;
    setError(''); setSubmitting(true);

    const res = await fetch('/api/student/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roster_id: data.myRoster.id,
        group_number: selectedGroupNum,
        academic_year: data.myRoster.academic_year,
      }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!json.ok) { setError(json.error); return; }
    router.push('/student/group');
    router.refresh();
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading group information…</p>
      </div>
    );
  }

  if (!data?.myRoster) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-6">
          <p className="text-sm text-destructive">
            No roster entry found for you. You may not be a group leader, or the admin has not yet uploaded the roster.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Create Your Group</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Select an available group number and confirm your members.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Step 1: Select group number */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <p className="mb-1 text-sm font-semibold">Step 1 — Select a group number</p>
          <p className="mb-4 text-xs text-muted-foreground">
            Choose from the available numbers below. Once you claim a number, it is removed from
            the list for other groups.
          </p>

          <div className="relative">
            <select
              value={selectedGroupId}
              onChange={handleSelectGroup}
              required
              className="w-full appearance-none rounded-lg border border-input bg-background px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— Select a group number —</option>
              {data.available.map((g) => (
                <option key={g.id} value={g.id}>
                  Group {g.group_number}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
          </div>

          {data.available.length === 0 && (
            <p className="mt-2 text-xs text-destructive">All group numbers for your cohort have been claimed.</p>
          )}
        </div>

        {/* Step 2: Confirm members */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <p className="mb-1 text-sm font-semibold">Step 2 — Confirm your members</p>
          <p className="mb-4 text-xs text-muted-foreground">
            These members were pre-assigned by the admin based on course-rep groupings.
            All confirmed members will be added to the group.
          </p>

          <ul className="space-y-2">
            {(data.memberDetails ?? []).map((m, i) => (
              <li
                key={m.index_number}
                className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 px-4 py-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-xs font-bold text-muted-foreground shadow-sm">
                  {i + 1}
                </span>
                <UserCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {m.full_name ?? (
                      <span className="italic text-muted-foreground">Not registered yet</span>
                    )}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">{m.index_number}</p>
                </div>
                <div className="flex gap-2">
                  {m.registered ? (
                    <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                      <CheckCircle2 className="h-3 w-3" /> Registered
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Not registered
                    </span>
                  )}
                  {m.is_leader && (
                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      <Crown className="h-3 w-3" /> Leader
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !selectedGroupId || data.available.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {submitting ? 'Creating group…' : 'Confirm & Create Group'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
