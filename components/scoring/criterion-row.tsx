'use client';

import { cn } from '@/lib/utils';

export type Criterion = {
  id: string;
  criterion: string;
  description: string | null;
  max_score: number;
  weight: number;
  display_order: number;
};

export function CriterionRow({
  criterion,
  score,
  comment,
  disabled,
  onChange,
}: {
  criterion: Criterion;
  score: number | null;
  comment: string;
  disabled: boolean;
  onChange: (score: number | null, comment: string) => void;
}) {
  const filled = score !== null;
  const pct = filled ? Math.min(100, Math.round((score / criterion.max_score) * 100)) : 0;

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-5 transition-colors duration-150',
        filled && !disabled ? 'border-primary/30' : 'border-border'
      )}
    >
      {/* Header row: criterion info + score input */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-foreground">
            {criterion.criterion}
          </h4>
          {criterion.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {criterion.description}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Weight ×{criterion.weight} · Max {criterion.max_score}
          </p>
        </div>

        {/* Score input + denominator */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <input
            type="number"
            min={0}
            max={criterion.max_score}
            step={1}
            value={score ?? ''}
            disabled={disabled}
            onChange={(e) => {
              const v = e.target.value === '' ? null : Number(e.target.value);
              onChange(v, comment);
            }}
            placeholder="—"
            className={cn(
              'w-20 rounded-md border px-3 py-2 text-center text-base font-bold tabular-nums transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
              disabled
                ? 'cursor-not-allowed border-input bg-muted opacity-60'
                : filled
                  ? 'border-primary/40 bg-primary-muted text-primary'
                  : 'border-input bg-background text-foreground'
            )}
          />
          <span className="text-sm font-medium text-muted-foreground">
            / {criterion.max_score}
          </span>
        </div>
      </div>

      {/* Progress bar — only when a score has been entered */}
      {filled && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              pct >= 80 ? 'bg-success' : pct >= 50 ? 'bg-warning' : 'bg-destructive'
            )}
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}

      {/* Comment textarea */}
      <textarea
        value={comment}
        disabled={disabled}
        onChange={(e) => onChange(score, e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Optional comment for this criterion…"
        className={cn(
          'mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      />
    </div>
  );
}
