'use client';

import { useEffect, useState } from 'react';
import { aggregateScores, type Criterion as ACriterion, type Score, type DefenseAggregate } from '@/lib/scoring/aggregate';
import { SkeletonCard } from '@/components/layout/dashboard-bits';
import type { Criterion } from './criterion-row';

type Panelist = { id: string; full_name: string };

export function AggregateView({
  defenseId,
  panelists,
}: {
  defenseId: string;
  panelists: Panelist[];
}) {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [aggregate, setAggregate] = useState<DefenseAggregate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/scoring/${defenseId}`);
        const data = await res.json();
        if (!data.ok) return;
        setCriteria(data.criteria);

        const scores: Score[] = (data.scores ?? []).map((s: any) => ({
          panelist_id: s.panelist_id,
          criterion_id: s.criterion_id,
          score: s.score,
          comment: s.comment,
          submitted: s.submitted,
        }));

        const acrit: ACriterion[] = data.criteria.map((c: Criterion) => ({
          id: c.id,
          criterion: c.criterion,
          max_score: c.max_score,
          weight: c.weight,
          display_order: c.display_order,
        }));

        setAggregate(aggregateScores(acrit, scores, panelists));
      } finally {
        setLoading(false);
      }
    })();
  }, [defenseId, panelists]);

  if (loading) {
    return <SkeletonCard lines={5} />;
  }

  if (!aggregate || aggregate.per_panelist.every((p) => !p.submitted)) {
    return (
      <div className="rounded-lg border border-warning/40 bg-warning/15 p-5">
        <p className="text-sm font-semibold text-foreground">
          No submitted scores yet
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Once panel members submit their scores, an aggregated breakdown will
          appear here and you can make the pass/fail decision.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Headline */}
      <div
        className={
          'rounded-lg border p-5 ' +
          ((aggregate.overall_percentage ?? 0) >= 0.5
            ? 'border-success/30 bg-success/10'
            : 'border-destructive/30 bg-destructive/10')
        }
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-foreground">
              {aggregate.all_submitted
                ? 'All panelists have submitted'
                : `${aggregate.per_panelist.filter((p) => p.submitted).length} of ${aggregate.per_panelist.length} panelists submitted`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Mean weighted score across submitted panelists.
            </p>
          </div>
          <span className="text-3xl font-semibold tabular-nums text-foreground">
            {aggregate.overall_percentage !== null
              ? `${Math.round(aggregate.overall_percentage * 100)}%`
              : '—'}
          </span>
        </div>
      </div>

      {/* Per-panelist table */}
      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border bg-secondary/50 px-5 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            Score breakdown
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="px-5 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Criterion
                </th>
                {aggregate.per_panelist.map((p) => (
                  <th
                    key={p.panelist_id}
                    className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {p.panelist_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {criteria.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-2.5">
                    <div className="text-sm font-medium text-foreground">
                      {c.criterion}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ×{c.weight} · max {c.max_score}
                    </div>
                  </td>
                  {aggregate.per_panelist.map((p) => {
                    const cell = p.per_criterion.find(
                      (x) => x.criterion_id === c.id
                    );
                    return (
                      <td
                        key={p.panelist_id}
                        className="px-3 py-2.5 text-center tabular-nums"
                      >
                        <span className="text-base font-semibold text-foreground">
                          {cell?.score ?? '—'}
                        </span>
                        {cell?.comment && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            "{cell.comment.slice(0, 60)}
                            {cell.comment.length > 60 ? '…' : ''}"
                          </p>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Totals row */}
              <tr className="bg-secondary/30 font-semibold">
                <td className="px-5 py-3 text-sm text-foreground">
                  Weighted total
                </td>
                {aggregate.per_panelist.map((p) => (
                  <td
                    key={p.panelist_id}
                    className="px-3 py-3 text-center tabular-nums"
                  >
                    {p.submitted ? (
                      <>
                        <div className="text-base text-foreground">
                          {Math.round(p.percentage * 100)}%
                        </div>
                        <div className="text-xs font-normal text-muted-foreground">
                          {p.weighted_total.toFixed(1)} / {p.weighted_max}
                        </div>
                      </>
                    ) : (
                      <span className="text-xs font-normal text-muted-foreground">
                        Draft
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
