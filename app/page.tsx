import Link from 'next/link';
import { Logo } from '@/components/layout/logo';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo size={36} showWordmark />
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-20 text-center">
        {/* Decorative emerald gradient backdrop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% 0%, hsl(var(--primary) / 0.08), transparent)',
          }}
        />

        <div className="mx-auto max-w-3xl">
          <span className="pill pill-success">University of Mines and Technology</span>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Supervise, assess, and archive — in one place.
          </h1>
          <p className="mt-5 text-base text-muted-foreground md:text-lg">
            OTAS replaces fragmented paper-based supervision and archiving with
            a unified digital platform. Track sessions, conduct structured
            defense assessments, validate originality, and preserve approved
            work.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-card hover:bg-primary/90"
            >
              Create an account
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-border bg-card px-5 py-3 text-sm font-medium text-foreground hover:bg-secondary"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-16 grid w-full max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
          {FEATURES.map((c) => (
            <div
              key={c.title}
              className="rounded-lg border border-border bg-card p-5 text-left shadow-card"
            >
              <span className={`pill pill-${c.tone}`}>{c.kicker}</span>
              <h3 className="mt-3 text-base font-semibold text-foreground">
                {c.title}
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        OTAS — final-year project, University of Mines and Technology, Tarkwa.
      </footer>
    </main>
  );
}

const FEATURES = [
  {
    kicker: 'Supervision',
    tone: 'success' as const,
    title: 'Track sessions structurally',
    body:
      'Supervisors record weekly sessions with agendas, outcomes, and attachments. Students see their full timeline.',
  },
  {
    kicker: 'Assessment',
    tone: 'info' as const,
    title: 'Defense, scored properly',
    body:
      'Panel members score against weighted rubrics for synopsis and final defense. HoD reviews and signs off.',
  },
  {
    kicker: 'Originality',
    tone: 'warning' as const,
    title: 'Catch duplication early',
    body:
      'Title similarity and document plagiarism checks against the institutional archive — before submission.',
  },
];
