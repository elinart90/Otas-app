import Link from 'next/link';
import { StageBadge } from './stage-badge';
import type { DefenseStage, DefenseStatus } from '@/lib/defense/schema';
import { STATUS_LABEL } from '@/lib/defense/schema';

export type DefenseCardData = {
  id: string;
  stage: DefenseStage;
  scheduled_at: string;
  venue: string | null;
  status: DefenseStatus;
  projects?: { title: string } | null;
  panel?: Array<{
    panelist_id: string;
    users: { full_name: string } | null;
  }>;
};

const STATUS_TONE: Record<DefenseStatus, string> = {
  scheduled: 'pill pill-warning',
  in_progress: 'pill pill-info',
  completed: 'pill pill-success',
  cancelled: 'pill pill-muted',
};

export function DefenseCard({
  defense,
  href,
}: {
  defense: DefenseCardData;
  href: string;
}) {
  const scheduled = new Date(defense.scheduled_at);
  const dateLabel = scheduled.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Link
      href={href}
      className="block rounded-lg border border-border bg-card p-5 shadow-card transition-colors hover:bg-secondary"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground">
            {defense.projects?.title ?? 'Untitled project'}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{dateLabel}</p>
          {defense.venue && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              📍 {defense.venue}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StageBadge stage={defense.stage} />
          <span className={STATUS_TONE[defense.status]}>
            {STATUS_LABEL[defense.status]}
          </span>
        </div>
      </div>

      {defense.panel && defense.panel.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Panel ({defense.panel.length})
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {defense.panel.map((p) => (
              <span
                key={p.panelist_id}
                className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {p.users?.full_name ?? 'Unknown'}
              </span>
            ))}
          </div>
        </div>
      )}
    </Link>
  );
}
