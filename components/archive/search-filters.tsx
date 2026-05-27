'use client';

type Programme = { id: string; name: string; code: string };

export function SearchFilters({
  q,
  year,
  programmeId,
  years,
  programmes,
  onChange,
}: {
  q: string;
  year: string;
  programmeId: string;
  years: number[];
  programmes: Programme[];
  onChange: (next: { q: string; year: string; programmeId: string }) => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[1fr_auto_auto]">
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Search
        </label>
        <input
          type="text"
          value={q}
          onChange={(e) => onChange({ q: e.target.value, year, programmeId })}
          placeholder="Title or abstract keywords…"
          className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Year
        </label>
        <select
          value={year}
          onChange={(e) => onChange({ q, year: e.target.value, programmeId })}
          className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Programme
        </label>
        <select
          value={programmeId}
          onChange={(e) =>
            onChange({ q, year, programmeId: e.target.value })
          }
          className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All programmes</option>
          {programmes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
