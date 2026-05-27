import { OutcomeBadge } from './outcome-badge';
import type { SupervisionOutcome } from '@/lib/supervision/schema';

export type SessionCardData = {
  id: string;
  session_date: string;
  agenda: string;
  notes: string | null;
  outcome: SupervisionOutcome;
  next_steps: string | null;
  projects?: { title: string } | null;
  supervisor?: { full_name: string } | null;
  attachments?: Array<{ id: string; file_name: string }>;
};

/**
 * Used for both supervisor list view and student timeline.
 * Pass `showProject` to render project title (supervisor view) or hide it
 * (student detail view where it's already in the header).
 */
export function SessionCard({
  session,
  showProject = false,
}: {
  session: SessionCardData;
  showProject?: boolean;
}) {
  const date = new Date(session.session_date);
  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-card">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {dateLabel}
          </p>
          <h3 className="mt-1 text-base font-semibold text-foreground">
            {session.agenda}
          </h3>
          {showProject && session.projects?.title && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {session.projects.title}
            </p>
          )}
        </div>
        <OutcomeBadge outcome={session.outcome} />
      </header>

      {session.notes && (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Session notes
          </p>
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {session.notes}
          </p>
        </div>
      )}

      {session.next_steps && (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Next steps
          </p>
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-foreground">
            {session.next_steps}
          </p>
        </div>
      )}

      {session.attachments && session.attachments.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {session.attachments.map((att) => (
            <span
              key={att.id}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground"
            >
              📎 {att.file_name}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
