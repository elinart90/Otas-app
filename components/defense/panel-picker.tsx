'use client';

import { cn } from '@/lib/utils';

export type Panelist = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

export function PanelPicker({
  panelists,
  selected,
  onChange,
  disabled,
}: {
  panelists: Panelist[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  function toggle(id: string) {
    if (disabled) return;
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      if (selected.length >= 4) return;
      onChange([...selected, id]);
    }
  }

  const count = selected.length;
  const countTone =
    count < 2 ? 'text-muted-foreground' : count > 4 ? 'text-destructive' : 'text-success';

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className={cn('text-xs font-medium', countTone)}>
          {count} of 2–4 panelists selected
        </p>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-muted-foreground hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {panelists.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No eligible panelists found.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {panelists.map((p) => {
            const isSelected = selected.includes(p.id);
            const isCapped = !isSelected && selected.length >= 4;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  disabled={disabled || isCapped}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-left transition-colors',
                    isSelected
                      ? 'border-primary bg-primary-muted text-primary'
                      : isCapped
                        ? 'cursor-not-allowed border-border bg-card opacity-40'
                        : 'border-border bg-card hover:bg-secondary'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {p.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.email} · {p.role}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background'
                    )}
                  >
                    {isSelected && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
