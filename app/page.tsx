import Link from 'next/link';
import {
  FolderOpen, CalendarDays, GraduationCap,
  Search, ShieldCheck, Archive,
  Users, Building2, ClipboardList, ArrowRight,
  CheckCircle, BookOpen,
} from 'lucide-react';
import { Logo } from '@/components/layout/logo';

// ── Feature data ────────────────────────────────────────────
const FEATURES = [
  {
    icon: FolderOpen,
    kicker: 'Proposals',
    tone: 'success' as const,
    title: 'Digital project proposals',
    body: 'Students submit proposals online. Supervisors approve or reject with structured feedback. The full workflow is paperless and trackable.',
  },
  {
    icon: CalendarDays,
    kicker: 'Supervision',
    tone: 'info' as const,
    title: 'Structured session tracking',
    body: 'Supervisors record every session with agenda, notes, outcome, and attachments. Students view their complete supervision history.',
  },
  {
    icon: GraduationCap,
    kicker: 'Assessment',
    tone: 'warning' as const,
    title: 'Rubric-based defense scoring',
    body: 'Panel members score synopsis and final defenses against weighted criteria. The HoD reviews aggregated scores and makes the pass/fail call.',
  },
  {
    icon: Search,
    kicker: 'Originality',
    tone: 'info' as const,
    title: 'Title similarity detection',
    body: 'A Jaro-Winkler + token-set hybrid engine checks proposed titles against the archive before submission — catching duplicates automatically.',
  },
  {
    icon: ShieldCheck,
    kicker: 'Integrity',
    tone: 'warning' as const,
    title: 'Document plagiarism screening',
    body: 'PDF text extraction and n-gram fingerprinting compares uploaded documents against the full institutional archive for originality.',
  },
  {
    icon: Archive,
    kicker: 'Archive',
    tone: 'success' as const,
    title: 'Permanent digital archive',
    body: 'Approved final projects are preserved in a read-only, watermarked, audit-logged archive accessible to students, supervisors, and faculty.',
  },
];

const STEPS = [
  { num: '01', icon: FolderOpen,   title: 'Submit a proposal',      body: 'Students choose a supervisor and submit their project proposal. A live title similarity check runs as they type.' },
  { num: '02', icon: CalendarDays, title: 'Supervision & progress',  body: 'The supervisor records every session throughout the semester. Students can review the complete timeline at any time.' },
  { num: '03', icon: GraduationCap,title: 'Defense assessment',      body: 'The HoD schedules synopsis and final defenses. Panel members score each student on a structured rubric.' },
  { num: '04', icon: Archive,       title: 'Archive & preserve',      body: 'Approved projects are uploaded to the permanent digital archive, searchable by future students and faculty.' },
];

const ROLES = [
  { icon: BookOpen,     label: 'Student',          color: 'bg-info/10 text-info border-info/20',             desc: 'Submit proposals, run title & plagiarism checks, track supervision, and view your defense results.' },
  { icon: Users,        label: 'Supervisor',        color: 'bg-success/10 text-success border-success/20',   desc: 'Review proposals, record supervision sessions, and upload final approved documents to the archive.' },
  { icon: ClipboardList,label: 'Panel member',      color: 'bg-warning/15 text-warning-foreground border-warning/30', desc: 'Access assigned defense sessions and submit criterion-level scores against the official rubric.' },
  { icon: Building2,    label: 'HoD / Coordinator', color: 'bg-primary-muted text-primary border-primary/20', desc: 'Schedule defenses, manage panel assignments, review aggregated scores, and make pass/fail decisions.' },
  { icon: ShieldCheck,  label: 'Administrator',     color: 'bg-muted text-muted-foreground border-border',    desc: 'Configure departments, programmes, manage users, and upload approved projects to the archive.' },
];

const STATS = [
  { value: '15',   label: 'Departments'  },
  { value: '16+',  label: 'Programmes'   },
  { value: '5',    label: 'User roles'   },
  { value: '100%', label: 'Paperless'    },
];

const TONE_STYLES = {
  success: { pill: 'bg-success/10 text-success border-success/20', icon: 'bg-success/10 text-success' },
  info:    { pill: 'bg-info/10 text-info border-info/20',          icon: 'bg-info/10 text-info'       },
  warning: { pill: 'bg-warning/15 text-warning-foreground border-warning/30', icon: 'bg-warning/15 text-warning-foreground' },
};

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">

      {/* ── Top info bar ──────────────────────────────────────── */}
      <div className="bg-[#0e3d28] px-6 py-2 text-xs text-white/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span>University of Mines and Technology · Tarkwa, Ghana</span>
          <span className="hidden sm:inline italic">Knowledge · Truth · Excellence</span>
        </div>
      </div>

      {/* ── Navigation header ─────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Logo size={36} showWordmark />
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-secondary"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors duration-150 hover:bg-primary/90"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Subtle radial backdrop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 90% 60% at 50% -10%, hsl(var(--primary) / 0.10), transparent)',
          }}
        />
        {/* Decorative grid dots */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary-muted px-3 py-1 text-xs font-semibold text-primary">
            University of Mines and Technology
          </span>

          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Supervise, assess, and{' '}
            <span className="text-primary">archive</span> — in one place.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            OTAS replaces fragmented paper-based supervision records and
            physical archive storage with a unified digital platform — from
            proposal to permanent archive.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-card transition-colors duration-150 hover:bg-primary/90"
            >
              Create an account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-secondary"
            >
              Sign in
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            {['Role-based access control', 'Audit-logged archive', 'Plagiarism detection', 'Paperless workflow'].map((b) => (
              <span key={b} className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-success" />
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────── */}
      <section className="border-b border-border bg-card py-10">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-extrabold text-primary">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features grid ─────────────────────────────────────── */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Features</p>
            <h2 className="mt-2 text-3xl font-bold text-foreground">
              Everything the project lifecycle needs
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              From first proposal to permanent archive — every stage is covered
              in a single, integrated platform.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              const style = TONE_STYLES[f.tone];
              return (
                <div
                  key={f.title}
                  className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-card transition-all duration-150 hover:border-primary/20 hover:shadow-elevated"
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.icon}`} aria-hidden>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <span className={`pill border text-[10px] font-semibold uppercase tracking-wider ${style.pill}`}>
                      {f.kicker}
                    </span>
                    <h3 className="mt-2 text-base font-semibold text-foreground">{f.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────── */}
      <section className="border-y border-border bg-secondary/40 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Process</p>
            <h2 className="mt-2 text-3xl font-bold text-foreground">How it works</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              A structured four-stage journey from idea to archived research output.
            </p>
          </div>

          <div className="relative grid gap-6 md:grid-cols-4">
            {/* Connector line */}
            <div
              aria-hidden
              className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block"
            />

            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.num} className="relative flex flex-col items-center text-center">
                  {/* Number + icon circle */}
                  <div className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary bg-card shadow-card">
                    <Icon className="h-5 w-5 text-primary" aria-hidden />
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                      {step.num.slice(-2)}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Roles section ─────────────────────────────────────── */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Who uses OTAS?</p>
            <h2 className="mt-2 text-3xl font-bold text-foreground">Built for every role</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Five distinct roles with separate dashboards, permissions, and workflows — all in one system.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {ROLES.map((r) => {
              const Icon = r.icon;
              return (
                <div
                  key={r.label}
                  className={`flex flex-col gap-3 rounded-xl border p-5 ${r.color} transition-shadow duration-150 hover:shadow-card`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/60">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold">{r.label}</p>
                    <p className="mt-1 text-xs leading-relaxed opacity-80">{r.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────── */}
      <section className="bg-[#0e3d28] py-16 text-white">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-extrabold">
            Ready to modernise your project management?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/70">
            Join the University of Mines and Technology's digital platform for
            undergraduate project supervision, assessment, and archive management.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-bold text-[#0e3d28] shadow-card transition-opacity hover:opacity-90"
            >
              Create an account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 md:flex-row md:justify-between">
          <Logo size={28} showWordmark />
          <p className="text-xs text-muted-foreground text-center">
            OTAS — Online Thesis Archive &amp; Supervision System ·{' '}
            University of Mines and Technology, Tarkwa · Ghana
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link href="/login" className="hover:text-foreground hover:underline">Sign in</Link>
            <Link href="/register" className="hover:text-foreground hover:underline">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
