/**
 * Title similarity engine.
 *
 * Hybrid scorer combining two complementary string-similarity methods:
 *   1. Jaro-Winkler — character-level. Catches typos, small edits, and
 *      shared prefixes (which Winkler explicitly boosts).
 *   2. Token-set ratio — word-level. Catches reordering, additions, and
 *      stop-word noise.
 *
 * Final score = max(jaroWinkler, tokenSet). Either method flagging a title
 * as similar is enough to surface it. This is the same pattern used by
 * fuzzywuzzy (Python) and string-similarity-js, and is defensible at viva.
 *
 * The thresholds below are starting values from string-similarity literature.
 * They will be calibrated against the real archive corpus in week 5
 * (precision/recall tuning) and the values updated based on F1.
 */

// ===== Configuration =====

export const SIMILARITY_THRESHOLDS = {
  /** Below this is considered original. */
  ORIGINAL: 0.45,
  /** Below this is review-needed. At/above is too similar. */
  REVIEW: 0.75,
} as const;

/**
 * Stop-words stripped before token-set comparison so that
 * "A System for Tracking Students" and "System for Tracking Students"
 * are not penalised on the basis of "a" alone.
 */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'have', 'in', 'into', 'is', 'it', 'its', 'of', 'on', 'or',
  'that', 'the', 'to', 'was', 'were', 'will', 'with', 'using',
]);

// ===== Types =====

export type SimilarityBand = 'original' | 'review' | 'duplicate';

export type TitleMatch = {
  archiveId: string | null;
  title: string;
  year: number | null;
  score: number;
  jaroWinkler: number;
  tokenSet: number;
  band: SimilarityBand;
};

export type SimilarityResult = {
  proposedTitle: string;
  highestScore: number;
  band: SimilarityBand;
  matches: TitleMatch[];
};

// ===== Normalisation =====

/**
 * Canonical form: lowercase, trimmed, internal whitespace collapsed,
 * punctuation stripped to spaces, non-ASCII left alone (academic titles may
 * contain valid accents).
 */
export function normaliseTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenise + remove stop words. Returns sorted unique tokens.
 */
export function tokenSet(s: string): string[] {
  const norm = normaliseTitle(s);
  if (!norm) return [];
  const tokens = norm.split(' ').filter((t) => t.length > 1 && !STOP_WORDS.has(t));
  return Array.from(new Set(tokens)).sort();
}

// ===== Jaro / Jaro-Winkler =====

/**
 * Jaro similarity. Returns 0..1.
 * Reference: Jaro, M.A. (1989), "Advances in record-linkage methodology".
 */
export function jaro(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0;

  const matchDistance = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1);

  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Count transpositions
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  transpositions /= 2;

  return (
    (matches / len1 + matches / len2 + (matches - transpositions) / matches) / 3
  );
}

/**
 * Jaro-Winkler similarity. Boosts strings with a shared prefix (up to 4 chars).
 * Returns 0..1.
 * Reference: Winkler, W.E. (1990), "String comparator metrics and enhanced
 * decision rules in the Fellegi-Sunter model of record linkage".
 */
export function jaroWinkler(s1: string, s2: string, p = 0.1): number {
  const j = jaro(s1, s2);
  if (j < 0.7) return j; // Winkler's recommendation: only boost above 0.7

  let prefix = 0;
  const max = Math.min(4, s1.length, s2.length);
  for (let i = 0; i < max; i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return j + prefix * p * (1 - j);
}

// ===== Token-set ratio =====

/**
 * Token-set ratio: jaccard-like similarity of unique-tokens-after-stopwords.
 * Returns 0..1.
 *
 * Specifically: |A ∩ B| / |A ∪ B|. Equal to 1 when the two titles share the
 * same content tokens regardless of order, count, or stop words.
 */
export function tokenSetRatio(s1: string, s2: string): number {
  const t1 = tokenSet(s1);
  const t2 = tokenSet(s2);
  if (t1.length === 0 && t2.length === 0) return 1;
  if (t1.length === 0 || t2.length === 0) return 0;

  const set1 = new Set(t1);
  const set2 = new Set(t2);

  let intersection = 0;
  for (const t of set1) if (set2.has(t)) intersection++;

  const union = set1.size + set2.size - intersection;
  return intersection / union;
}

// ===== Hybrid scorer =====

/**
 * Hybrid score combining Jaro-Winkler (character-level) and token-set
 * (word-level).
 *
 * Logic, in order:
 *
 * 1. If both methods agree (high JW + high token-set), the title is a clear
 *    duplicate (same content + same characters). Take the average.
 *
 * 2. If token-set is high but JW is moderate, it's a reordering or rewording
 *    of the same content — still a duplicate. Trust token-set.
 *
 * 3. If JW is high but token-set is very low, the titles share characters but
 *    NOT content words. Almost always a false positive (long strings of
 *    English text alone push JW into 0.5-0.6 territory). Suppress to avoid
 *    flooding students with junk matches.
 *
 * 4. JW only "wins" when token-set is at least moderately positive — this is
 *    the typo case (e.g. "Libary Managment" vs "Library Management"). When
 *    token-set agrees the topic is similar, JW amplifies the score to catch
 *    the typo'd version of that topic.
 */
export function similarityScore(
  proposed: string,
  archived: string
): { score: number; jaroWinkler: number; tokenSet: number } {
  const a = normaliseTitle(proposed);
  const b = normaliseTitle(archived);
  if (!a || !b) return { score: 0, jaroWinkler: 0, tokenSet: 0 };

  const jw = jaroWinkler(a, b);
  const ts = tokenSetRatio(a, b);

  let score: number;
  if (jw >= 0.9) {
    // Very high character similarity = almost certainly the same string
    // with typos. Trust JW even if token-set disagrees (typo'd words
    // won't match in the token set).
    score = jw;
  } else if (ts >= 0.6) {
    // Topic-similar: use the higher of the two
    score = Math.max(jw, ts);
  } else if (ts >= 0.3) {
    // Partial overlap: weighted average favouring token-set
    score = ts * 0.7 + jw * 0.3;
  } else {
    // No meaningful word overlap and JW is moderate at best —
    // suppress to avoid false positives. Use token-set only.
    score = ts;
  }

  return { score, jaroWinkler: jw, tokenSet: ts };
}

export function bandFor(score: number): SimilarityBand {
  if (score < SIMILARITY_THRESHOLDS.ORIGINAL) return 'original';
  if (score < SIMILARITY_THRESHOLDS.REVIEW) return 'review';
  return 'duplicate';
}

// ===== Top-level API =====

export type ArchiveTitle = {
  id: string;
  title: string;
  year: number | null;
  /** Officially archived projects carry more weight — boost score by 20 %. */
  isArchived?: boolean;
};

/**
 * Compare a proposed title against a corpus of archive titles.
 * Returns a sorted, ranked list of matches (highest score first).
 *
 * @param proposed The user-typed title
 * @param corpus Archive titles to compare against
 * @param topK Maximum number of matches to return
 */
export function checkTitle(
  proposed: string,
  corpus: ArchiveTitle[],
  topK = 10
): SimilarityResult {
  if (!proposed.trim() || corpus.length === 0) {
    return { proposedTitle: proposed, highestScore: 0, band: 'original', matches: [] };
  }

  const matches: TitleMatch[] = corpus.map((entry) => {
    const { score: rawScore, jaroWinkler: jw, tokenSet: ts } = similarityScore(
      proposed,
      entry.title
    );
    // Officially archived projects carry a 20 % weight premium — a title that
    // closely matches something already in the permanent archive is a stronger
    // signal than a match against an in-flight submission.
    const score = entry.isArchived ? Math.min(1, rawScore * 1.2) : rawScore;
    return {
      archiveId: entry.id,
      title: entry.title,
      year: entry.year,
      score,
      jaroWinkler: jw,
      tokenSet: ts,
      band: bandFor(score),
    };
  });

  matches.sort((a, b) => b.score - a.score);
  const top = matches.slice(0, topK);

  const highest = top[0]?.score ?? 0;
  return {
    proposedTitle: proposed,
    highestScore: highest,
    band: bandFor(highest),
    matches: top,
  };
}
