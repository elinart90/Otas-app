'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/layout/logo';
import { registerAction, type RegisterState } from './actions';
import { getStudentLevelLabel, isFinalYear } from '@/lib/student-level';

export type ProgrammeOption = { id: string; name: string; code: string | null };
export type DepartmentOption = {
  id: string;
  name: string;
  code: string | null;
  programmes: ProgrammeOption[];
};
export type FacultyOption = {
  name: string;
  departments: DepartmentOption[];
};

interface Props {
  faculties: FacultyOption[];
}

// ── Constants ────────────────────────────────────────────────
const INDEX_REGEX = /^[A-Z]{2,6}\.\d{2}\.\d{3}\.\d{3}\.\d{2}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES_NEEDING_DEPT = new Set(['student', 'supervisor', 'hod']);

const PWD_CHECKS = [
  { label: 'At least 8 characters',  ok: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter',    ok: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number',             ok: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character',  ok: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

// ── Types ────────────────────────────────────────────────────
type Fields = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  indexNumber: string;
  staffId: string;
  facultyName: string;
  departmentId: string;
  programmeId: string;
};

type Errors = Partial<Record<keyof Fields, string>>;

// ── Validation ───────────────────────────────────────────────
function validate(f: Fields): Errors {
  const err: Errors = {};

  if (!f.fullName.trim()) {
    err.fullName = 'Full name is required';
  } else if (f.fullName.trim().length < 3) {
    err.fullName = 'At least 3 characters required';
  } else if (!/^[A-Za-z\s'.-]+$/.test(f.fullName.trim())) {
    err.fullName = 'Only letters, spaces, hyphens, and apostrophes';
  }

  if (!f.email.trim()) {
    err.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(f.email)) {
    err.email = 'Enter a valid email (e.g. name@example.com)';
  }

  if (!f.password) {
    err.password = 'Password is required';
  } else if (f.password.length < 8) {
    err.password = 'At least 8 characters';
  } else if (!/[A-Z]/.test(f.password)) {
    err.password = 'Add at least one uppercase letter';
  } else if (!/[0-9]/.test(f.password)) {
    err.password = 'Add at least one number';
  } else if (!/[^A-Za-z0-9]/.test(f.password)) {
    err.password = 'Add at least one special character';
  }

  if (!f.confirmPassword) {
    err.confirmPassword = 'Please confirm your password';
  } else if (f.confirmPassword !== f.password) {
    err.confirmPassword = 'Passwords do not match';
  }

  if (ROLES_NEEDING_DEPT.has(f.role)) {
    if (!f.facultyName) err.facultyName = 'Please select a faculty';
    if (!f.departmentId) err.departmentId = 'Please select a department';
  }

  if (f.role === 'student') {
    if (!f.indexNumber.trim()) {
      err.indexNumber = 'Index number is required';
    } else if (!INDEX_REGEX.test(f.indexNumber.trim())) {
      err.indexNumber = 'Format: FOE.41.008.001.22';
    }
    if (f.departmentId && !f.programmeId) {
      err.programmeId = 'Please select a programme';
    }
  }

  return err;
}

// ── Sub-components ───────────────────────────────────────────
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-card transition hover:bg-primary/90 disabled:opacity-60"
    >
      {pending ? 'Creating account…' : 'Create account'}
    </button>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-destructive">{msg}</p>;
}

function inputClass(hasError: boolean) {
  return `w-full rounded-md border px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-ring ${
    hasError ? 'border-destructive' : 'border-input'
  }`;
}

// ── Main component ───────────────────────────────────────────
export function RegisterForm({ faculties }: Props) {
  const [state, action] = useFormState<RegisterState, FormData>(registerAction, undefined);

  const [fields, setFields] = useState<Fields>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    indexNumber: '',
    staffId: '',
    facultyName: '',
    departmentId: '',
    programmeId: '',
  });

  const [touched, setTouched] = useState<Set<keyof Fields>>(new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const errors = validate(fields);
  const hasErrors = Object.keys(errors).length > 0;

  const isStudent = fields.role === 'student';
  const needsDept = ROLES_NEEDING_DEPT.has(fields.role);

  // Derived lists for cascading selects
  const selectedFaculty = faculties.find((f) => f.name === fields.facultyName) ?? null;
  const departments = selectedFaculty?.departments ?? [];
  const programmes = departments.find((d) => d.id === fields.departmentId)?.programmes ?? [];

  const show = (name: keyof Fields) => submitAttempted || touched.has(name);

  const set =
    (name: keyof Fields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value;
      setFields((prev) => {
        const next = { ...prev, [name]: value };
        // Cascade resets
        if (name === 'role') { next.facultyName = ''; next.departmentId = ''; next.programmeId = ''; }
        if (name === 'facultyName') { next.departmentId = ''; next.programmeId = ''; }
        if (name === 'departmentId') { next.programmeId = ''; }
        return next;
      });
    };

  const touch = (name: keyof Fields) => () =>
    setTouched((prev) => new Set(prev).add(name));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setSubmitAttempted(true);
    if (hasErrors) e.preventDefault();
  };

  const showPwdChecklist = fields.password.length > 0 || touched.has('password');

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, hsl(var(--primary) / 0.08), transparent)',
        }}
      />

      <div className="w-full max-w-md rounded-lg border border-border bg-card p-7 shadow-elevated">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={48} />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Join OTAS to manage your project lifecycle.
          </p>
        </div>

        <form action={action} onSubmit={handleSubmit} className="space-y-4">

          {/* Full name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full name</label>
            <input
              name="fullName"
              value={fields.fullName}
              onChange={set('fullName')}
              onBlur={touch('fullName')}
              placeholder="e.g. Kwame Mensah"
              className={inputClass(show('fullName') && !!errors.fullName)}
            />
            {show('fullName') && <FieldError msg={errors.fullName} />}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              name="email"
              value={fields.email}
              onChange={set('email')}
              onBlur={touch('email')}
              placeholder="e.g. name@example.com"
              className={inputClass(show('email') && !!errors.email)}
            />
            {show('email') && <FieldError msg={errors.email} />}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              name="password"
              value={fields.password}
              onChange={set('password')}
              onBlur={touch('password')}
              className={inputClass(show('password') && !!errors.password)}
            />
            {showPwdChecklist && (
              <ul className="mt-2 space-y-1 rounded-md border border-border bg-secondary/40 px-3 py-2">
                {PWD_CHECKS.map((c) => {
                  const passes = c.ok(fields.password);
                  return (
                    <li
                      key={c.label}
                      className={`flex items-center gap-2 text-xs transition-colors ${
                        passes ? 'text-success' : 'text-muted-foreground'
                      }`}
                    >
                      <span
                        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                          passes
                            ? 'bg-success/15 text-success'
                            : 'bg-border text-muted-foreground'
                        }`}
                      >
                        {passes ? '✓' : '○'}
                      </span>
                      {c.label}
                    </li>
                  );
                })}
              </ul>
            )}
            {show('password') && !showPwdChecklist && <FieldError msg={errors.password} />}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Confirm password</label>
            <input
              type="password"
              name="confirmPassword"
              value={fields.confirmPassword}
              onChange={set('confirmPassword')}
              onBlur={touch('confirmPassword')}
              className={inputClass(show('confirmPassword') && !!errors.confirmPassword)}
            />
            {show('confirmPassword') && <FieldError msg={errors.confirmPassword} />}
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Role</label>
            <select
              name="role"
              value={fields.role}
              onChange={set('role')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="student">Student</option>
              <option value="supervisor">Supervisor</option>
              <option value="panel">Panel member</option>
              <option value="hod">HoD / Project coordinator</option>
              <option value="admin">Department administrator</option>
            </select>
          </div>

          {/* Index number — students only */}
          {isStudent && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Index number</label>
              <input
                name="indexNumber"
                value={fields.indexNumber}
                onChange={set('indexNumber')}
                onBlur={touch('indexNumber')}
                placeholder="e.g. FOE.41.008.001.22"
                className={inputClass(show('indexNumber') && !!errors.indexNumber)}
              />
              <p className="text-xs text-muted-foreground">
                Format: FACULTY.XX.XXX.XXX.YY
              </p>
              {(() => {
                const label = getStudentLevelLabel(fields.indexNumber.trim());
                if (!label) return null;
                const final = isFinalYear(fields.indexNumber.trim());
                return (
                  <p className={`text-xs font-medium ${final ? 'text-success' : 'text-info'}`}>
                    Detected: {label}
                    {!final && ' — Tools access only until final year'}
                  </p>
                );
              })()}
              {show('indexNumber') && <FieldError msg={errors.indexNumber} />}
            </div>
          )}

          {/* Staff ID — non-students, optional */}
          {!isStudent && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Staff ID{' '}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                name="staffId"
                value={fields.staffId}
                onChange={set('staffId')}
                placeholder="e.g. STF-001"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {/* ── Faculty / Department / Programme cascade ── */}
          {needsDept && (
            <>
              {/* Step 1: Faculty */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Faculty / School</label>
                {/* Hidden field so server action receives facultyName */}
                <input type="hidden" name="facultyName" value={fields.facultyName} />
                <select
                  value={fields.facultyName}
                  onChange={set('facultyName')}
                  onBlur={touch('facultyName')}
                  className={inputClass(show('facultyName') && !!errors.facultyName)}
                >
                  <option value="">Select faculty…</option>
                  {faculties.map((f) => (
                    <option key={f.name} value={f.name}>{f.name}</option>
                  ))}
                </select>
                {show('facultyName') && <FieldError msg={errors.facultyName} />}
              </div>

              {/* Step 2: Department — appears after faculty chosen */}
              {fields.facultyName && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Department</label>
                  <select
                    name="departmentId"
                    value={fields.departmentId}
                    onChange={set('departmentId')}
                    onBlur={touch('departmentId')}
                    className={inputClass(show('departmentId') && !!errors.departmentId)}
                  >
                    <option value="">Select department…</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}{d.code ? ` (${d.code})` : ''}
                      </option>
                    ))}
                  </select>
                  {show('departmentId') && <FieldError msg={errors.departmentId} />}
                </div>
              )}

              {/* Step 3: Programme — students only, appears after dept chosen */}
              {isStudent && fields.departmentId && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Programme</label>
                  <select
                    name="programmeId"
                    value={fields.programmeId}
                    onChange={set('programmeId')}
                    onBlur={touch('programmeId')}
                    className={inputClass(show('programmeId') && !!errors.programmeId)}
                  >
                    <option value="">Select programme…</option>
                    {programmes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {show('programmeId') && <FieldError msg={errors.programmeId} />}
                </div>
              )}
            </>
          )}

          {/* Server error */}
          {state?.error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <SubmitButton />
        </form>


        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
        <p className="mt-2 text-center">
          <Link href="/" className="text-xs text-muted-foreground hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
