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
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
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
            Weight: ×{criterion.weight} · Max: {criterion.max_score}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
              'w-20 rounded-md border border-input bg-background px-3 py-2 text-center text-base font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-ring',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          />
          <span className="text-sm text-muted-foreground">
            / {criterion.max_score}
          </span>
        </div>
      </div>

      <textarea
        value={comment}
        disabled={disabled}
        onChange={(e) => onChange(score, e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Optional comment for this criterion…"
        className={cn(
          'mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      />
    </div>
  );
}
