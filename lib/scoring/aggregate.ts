/**
 * Score aggregation.
 *
 * Each panelist scores each criterion. The system computes:
 *   1. Per-panelist weighted score for the defense.
 *   2. Overall defense score = mean of per-panelist weighted scores.
 *
 * Weighted score formula (per panelist):
 *
 *   weightedScore = sum( score_c * weight_c ) / sum( max_score_c * weight_c )
 *
 * This produces a normalised value in [0, 1] which we present as a percentage.
 * Weights from rubric_criteria.weight let us emphasise critical sections
 * (e.g. Methodology 1.5x, Q&A 1.5x in our seeded synopsis rubric).
 *
 * Mean across panelists treats every panelist equally. An alternative would
 * be median (resistant to outliers) but mean is standard at UMaT and easier
 * to defend at viva.
 */

export type Criterion = {
  id: string;
  criterion: string;
  max_score: number;
  weight: number;
  display_order: number;
};

export type Score = {
  panelist_id: string;
  criterion_id: string;
  score: number;
  comment: string | null;
  submitted: boolean;
};

export type PanelistAggregate = {
  panelist_id: string;
  panelist_name: string;
  raw_total: number;
  max_possible: number;
  weighted_total: number;
  weighted_max: number;
  percentage: number;
  submitted: boolean;
  per_criterion: Array<{
    criterion_id: string;
    score: number | null;
    comment: string | null;
  }>;
};

export type DefenseAggregate = {
  per_panelist: PanelistAggregate[];
  overall_percentage: number | null;
  all_submitted: boolean;
};

export function aggregateScores(
  criteria: Criterion[],
  scores: Score[],
  panelists: Array<{ id: string; full_name: string }>
): DefenseAggregate {
  const criteriaById = new Map(criteria.map((c) => [c.id, c]));

  const per_panelist: PanelistAggregate[] = panelists.map((panelist) => {
    const myScores = scores.filter((s) => s.panelist_id === panelist.id);
    const submittedAll =
      myScores.length === criteria.length && myScores.every((s) => s.submitted);

    let weightedTotal = 0;
    let weightedMax = 0;
    let rawTotal = 0;
    let maxPossible = 0;

    const per_criterion: PanelistAggregate['per_criterion'] = criteria.map(
      (c) => {
        const s = myScores.find((sc) => sc.criterion_id === c.id);
        const value = s?.score ?? null;
        if (value !== null) {
          rawTotal += value;
          weightedTotal += value * c.weight;
        }
        maxPossible += c.max_score;
        weightedMax += c.max_score * c.weight;
        return {
          criterion_id: c.id,
          score: value,
          comment: s?.comment ?? null,
        };
      }
    );

    const percentage = weightedMax > 0 ? weightedTotal / weightedMax : 0;

    return {
      panelist_id: panelist.id,
      panelist_name: panelist.full_name,
      raw_total: rawTotal,
      max_possible: maxPossible,
      weighted_total: weightedTotal,
      weighted_max: weightedMax,
      percentage,
      submitted: submittedAll,
      per_criterion,
    };
  });

  const submittedPanelists = per_panelist.filter((p) => p.submitted);
  const overall_percentage =
    submittedPanelists.length > 0
      ? submittedPanelists.reduce((sum, p) => sum + p.percentage, 0) /
        submittedPanelists.length
      : null;

  const all_submitted =
    per_panelist.length > 0 && per_panelist.every((p) => p.submitted);

  return { per_panelist, overall_percentage, all_submitted };
}
