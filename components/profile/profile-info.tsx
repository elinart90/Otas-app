'use client';

import { useState } from 'react';
import { Pencil, Check, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/lib/rbac/permissions';

const ROLE_LABEL: Record<UserRole, string> = {
  student:    'Student',
  supervisor: 'Supervisor',
  panel:      'Panel member',
  hod:        'HoD / Coordinator',
  admin:      'Administrator',
};

type ProfileData = {
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  index_number: string | null;
  staff_id: string | null;
  is_active: boolean;
  created_at: string;
  departments: { name: string; code: string } | null;
  programmes: { name: string; code: string } | null;
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="text-sm text-foreground">{value || '—'}</span>
    </div>
  );
}

function PhoneField({ value }: { value: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(value ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!phone.trim()) { setError('Phone number is required'); return; }
    setPending(true);
    setError(null);
    const res = await fetch('/api/profile/phone', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.trim() }),
    });
    const json = await res.json();
    setPending(false);
    if (!res.ok) { setError(json.error ?? 'Failed to save'); return; }
    setEditing(false);
    router.refresh();
  }

  function cancel() {
    setPhone(value ?? '');
    setEditing(false);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Phone number
      </span>
      {editing ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-48"
              autoFocus
            />
            <button
              onClick={save}
              disabled={pending}
              className="flex items-center justify-center h-7 w-7 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              aria-label="Save"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={cancel}
              disabled={pending}
              className="flex items-center justify-center h-7 w-7 rounded-md border border-border hover:bg-secondary disabled:opacity-60"
              aria-label="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground">{phone || '—'}</span>
          <button
            onClick={() => setEditing(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Edit phone number"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export function ProfileInfo({ profile }: { profile: ProfileData }) {
  const joinedDate = new Date(profile.created_at).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Full name" value={profile.full_name} />

      {profile.role === 'student' && profile.index_number && (
        <Field label="Index number" value={profile.index_number} />
      )}
      {profile.role !== 'student' && profile.staff_id && (
        <Field label="Staff ID" value={profile.staff_id} />
      )}

      <Field label="Email" value={profile.email} />

      <PhoneField value={profile.phone} />

      <Field label="Role" value={ROLE_LABEL[profile.role]} />

      <Field
        label="Status"
        value={
          <span className={profile.is_active ? 'text-emerald-600' : 'text-destructive'}>
            {profile.is_active ? 'Active' : 'Inactive'}
          </span>
        }
      />

      {profile.departments && (
        <Field label="Department" value={profile.departments.name} />
      )}

      {profile.role === 'student' && profile.programmes && (
        <>
          <Field label="Programme" value={profile.programmes.name} />
          <Field label="Programme code" value={profile.programmes.code} />
        </>
      )}

      <Field label="Member since" value={joinedDate} />
    </div>
  );
}
