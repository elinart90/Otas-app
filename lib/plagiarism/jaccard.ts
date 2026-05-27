/**
 * Jaccard similarity and matched-passage detection.
 *
 * Jaccard similarity between two sets A and B is:
 *
 *     J(A, B) = |A ∩ B| / |A ∪ B|
 *
 * For documents represented as sets of shingle hashes, this gives the
 * fraction of distinct shingles they share — a robust similarity measure
 * that ignores duplicate phrases and document length differences.
 *
 * We also report MATCHED PASSAGES — contiguous runs of shingles in the
 * student's document that exist in an archived document. This is what
 * lets the UI highlight "these specific paragraphs are problematic"
 * instead of a single document-level percentage.
 */

import type { Shingle } from './shingles';

/** Jaccard similarity between two hash sets. Returns 0..1. */
export function jaccardSimilarity(a: Set<number>, b: Set<number>): number {
  if (a.size === 0 && b.size === 0) return 0;
  if (a.size === 0 || b.size === 0) return 0;

  // Iterate the smaller set for performance.
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let intersection = 0;
  for (const h of small) if (large.has(h)) intersection++;

  const union = a.size + b.size - intersection;
  return intersection / union;
}

/**
 * A contiguous run of matched shingles in the student document.
 * Token indices are inclusive at both ends.
 */
export type MatchedPassage = {
  studentStart: number;
  studentEnd: number;
  shingleCount: number;
};

/**
 * Given the student's shingles (with positions) and an archive's
 * fingerprint set, find all contiguous runs of matching shingles.
 *
 * Two adjacent shingles in the student doc are "contiguous" if they
 * overlap (their starts differ by 1) — this allows merging of long
 * matched passages into single highlighted regions.
 *
 * @param studentShingles Shingles with positions from student document
 * @param archiveFingerprint Set of hashes from archived document
 * @param shingleSize Window size used during shingling
 * @param minRun Minimum number of shingles to report as a passage
 */
export function findMatchedPassages(
  studentShingles: Shingle[],
  archiveFingerprint: Set<number>,
  shingleSize: number,
  minRun: number = 2
): MatchedPassage[] {
  const passages: MatchedPassage[] = [];
  let runStart = -1;
  let runEnd = -1;
  let runLength = 0;

  for (let i = 0; i < studentShingles.length; i++) {
    const s = studentShingles[i];
    if (archiveFingerprint.has(s.hash)) {
      if (runStart === -1) {
        runStart = s.start;
        runLength = 1;
      } else {
        runLength++;
      }
      runEnd = s.start + shingleSize - 1;
    } else if (runStart !== -1) {
      // End of a run
      if (runLength >= minRun) {
        passages.push({
          studentStart: runStart,
          studentEnd: runEnd,
          shingleCount: runLength,
        });
      }
      runStart = -1;
      runLength = 0;
    }
  }

  // Tail
  if (runStart !== -1 && runLength >= minRun) {
    passages.push({
      studentStart: runStart,
      studentEnd: runEnd,
      shingleCount: runLength,
    });
  }

  return passages;
}

/**
 * Total document similarity = sum of matched passage token lengths
 * divided by total student token count. Capped at 1.0 (since multiple
 * archives can match the same passage and would otherwise inflate this).
 */
export function passageCoverage(
  passages: MatchedPassage[],
  totalStudentTokens: number
): number {
  if (totalStudentTokens === 0) return 0;
  // Use a boolean mask of covered token positions to avoid double-counting
  // a passage that matches multiple archives.
  const covered = new Set<number>();
  for (const p of passages) {
    for (let i = p.studentStart; i <= p.studentEnd; i++) covered.add(i);
  }
  return Math.min(1, covered.size / totalStudentTokens);
}
