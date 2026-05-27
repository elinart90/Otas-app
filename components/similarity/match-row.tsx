import type { TitleMatch } from '@/lib/similarity/title-check';

const TONE_BY_BAND: Record<TitleMatch['band'], { pill: string; label: string; bar: string }> = {
  original: { pill: 'pill pill-success', label: 'Distinct', bar: 'bg-success' },
  review: { pill: 'pill pill-warning', label: 'Review', bar: 'bg-warning' },
  duplicate: { pill: 'pill pill-destructive', label: 'Too similar', bar: 'bg-destructive' },
};

export function MatchRow({ match }: { match: TitleMatch }) {
  const tone = TONE_BY_BAND[match.band];
  const pct = Math.round(match.score * 100);

  return (
    <div className="rounded-md border border-border bg-card p-4 transition-colors hover:bg-secondary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {match.title}
          </p>
          {match.year && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Archived {match.year}
            </p>
          )}
        </div>
        <span className={tone.pill}>{tone.label}</span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full transition-all ${tone.bar}`}
            style={{ width: `${pct}%` }}
            aria-hidden
          />
        </div>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {pct}%
        </span>
      </div>

      {/* Methodology breakdown — visible on hover/expand */}
      <div className="mt-2 flex gap-4 text-[10px] text-muted-foreground">
        <span>JW: {(match.jaroWinkler * 100).toFixed(0)}%</span>
        <span>TS: {(match.tokenSet * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}
