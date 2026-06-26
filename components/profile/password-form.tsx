'use client';

import { useState } from 'react';
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';

const PWD_CHECKS = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter',  test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number',            test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function PasswordForm() {
  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd]   = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const allChecksPass = PWD_CHECKS.every((c) => c.test(newPwd));
  const passwordsMatch = newPwd === confirm && confirm.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allChecksPass) { setError('New password does not meet all requirements'); return; }
    if (!passwordsMatch) { setError('Passwords do not match'); return; }

    setPending(true);
    setError(null);
    setSuccess(false);

    const res = await fetch('/api/profile/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: current, newPassword: newPwd, confirmPassword: confirm }),
    });
    const json = await res.json();
    setPending(false);

    if (!res.ok) { setError(json.error ?? 'Failed to update password'); return; }

    setSuccess(true);
    setCurrent('');
    setNewPwd('');
    setConfirm('');
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-5">
      <PasswordInput
        id="current-password"
        label="Current password"
        value={current}
        onChange={setCurrent}
        autoComplete="current-password"
      />

      <PasswordInput
        id="new-password"
        label="New password"
        value={newPwd}
        onChange={(v) => { setNewPwd(v); setSuccess(false); }}
        autoComplete="new-password"
      />

      {/* Requirements checklist */}
      {newPwd.length > 0 && (
        <ul className="space-y-1">
          {PWD_CHECKS.map((c) => (
            <li key={c.label} className={`flex items-center gap-2 text-xs ${c.test(newPwd) ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              {c.label}
            </li>
          ))}
        </ul>
      )}

      <PasswordInput
        id="confirm-password"
        label="Confirm new password"
        value={confirm}
        onChange={(v) => { setConfirm(v); setSuccess(false); }}
        autoComplete="new-password"
      />

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      {success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          Password updated successfully.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Update password
      </button>
    </form>
  );
}
