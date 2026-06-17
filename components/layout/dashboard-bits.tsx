import type { ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────
// StatCard
// ─────────────────────────────────────────────────────────────
// Optional `icon` accepts any lucide-react component.
// tone controls the left-border accent colour AND the icon bg.

const TONE_BORDER: Record<string, string> = {
  default:     'border-l-4 border-l-border',
  success:     'border-l-4 border-l-success',
  warning:     'border-l-4 border-l-warning',
  info:        'border-l-4 border-l-info',
  destructive: 'border-l-4 border-l-destructive',
};

const TONE_ICON_BG: Record<string, string> = {
  default:     'bg-secondary text-muted-foreground',
  success:     'bg-success/10 text-success',
  warning:     'bg-warning/15 text-warning-foreground',
  info:        'bg-info/10 text-info',
  destructive: 'bg-destructive/10 text-destructive',
};

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
  icon: Icon,
  href,
  linkLabel,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'info' | 'destructive';
  icon?: LucideIcon;
  /** Optional route — renders a "View all →" footer link */
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden rounded-lg border bg-card shadow-card transition-shadow duration-150 hover:shadow-elevated',
        TONE_BORDER[tone]
      )}
    >
      {/* Main body */}
      <div className="flex flex-1 items-start justify-between gap-3 p-5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
          {hint && (
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          )}
        </div>

        {Icon && (
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              TONE_ICON_BG[tone]
            )}
            aria-hidden
          >
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>

      {/* Optional "View all →" footer link */}
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1 border-t border-border px-5 py-2.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
        >
          {linkLabel ?? `View all ${label.toLowerCase()}`}
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PageHeader
// ─────────────────────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 border-b border-border pb-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EmptyCard  (D3 — solid border, soft bg tint, icon placeholder)
// ─────────────────────────────────────────────────────────────
export function EmptyCard({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 px-8 py-12 text-center">
      {/* Soft icon ring */}
      <div
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted"
        aria-hidden
      >
        <svg
          className="h-7 w-7 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
          />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        {body}
      </p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SectionCard  (unchanged visual contract, kept for consumers)
// ─────────────────────────────────────────────────────────────
export function SectionCard({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-6 shadow-card">
      {title && (
        <header className="mb-4">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </header>
      )}
      {children}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// SkeletonCard  (D2 — animated shimmer loading placeholder)
// ─────────────────────────────────────────────────────────────
// Drop this anywhere a data-fetching section needs a loading state.
// `lines` controls how many shimmer bars to render (default 3).
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  const widths = ['w-2/5', 'w-full', 'w-3/5', 'w-4/5', 'w-1/2'];
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-card">
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn('skeleton h-4', widths[i % widths.length])}
          />
        ))}
      </div>
    </div>
  );
}
