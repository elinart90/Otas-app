/**
 * N-gram shingle generation and hashing.
 *
 * A "shingle" is a sliding window of K consecutive tokens. For a document
 * of N tokens, we produce (N - K + 1) shingles. Each shingle is hashed to
 * a 32-bit integer for compact storage and fast set operations.
 *
 * K = 5 follows standard academic-plagiarism literature (e.g. Schleimer et
 * al. 2003, "Winnowing: local algorithms for document fingerprinting").
 * Smaller K (2-3) produces false positives on common phrases; larger K
 * (10+) only catches verbatim copy.
 */

/** Default shingle size — tune in week 5 if needed. */
export const SHINGLE_SIZE = 5;

/**
 * FNV-1a 32-bit hash. Fast, well-distributed, no dependencies.
 * Reference: https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function
 */
export function fnv1a(s: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    // 32-bit FNV prime multiplication via bit math (avoids BigInt cost)
    hash =
      (hash +
        ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>>
      0;
  }
  return hash >>> 0; // unsigned
}

/**
 * Each shingle records its hash AND its position in the token stream,
 * so the UI can show "this is the passage in your document that matches".
 */
export type Shingle = {
  /** 32-bit FNV-1a hash of the joined shingle text. */
  hash: number;
  /** Index of the first token in the original token array. */
  start: number;
};

/**
 * Generate shingles from a token stream.
 *
 * @param tokens Normalised tokens (from normaliseText)
 * @param size Shingle window size (default SHINGLE_SIZE)
 */
export function shingleTokens(
  tokens: string[],
  size: number = SHINGLE_SIZE
): Shingle[] {
  if (tokens.length < size) return [];
  const out: Shingle[] = new Array(tokens.length - size + 1);
  for (let i = 0; i <= tokens.length - size; i++) {
    // Join with single space for stable hashing
    const slice = tokens.slice(i, i + size).join(' ');
    out[i] = { hash: fnv1a(slice), start: i };
  }
  return out;
}

/**
 * Build a compact hash-only fingerprint for a document. This is what we
 * store in the database for archived projects (so we don't have to
 * re-shingle them on every comparison).
 *
 * Returns a Set of unique hashes — order and positions discarded.
 */
export function fingerprintTokens(
  tokens: string[],
  size: number = SHINGLE_SIZE
): Set<number> {
  const shingles = shingleTokens(tokens, size);
  return new Set(shingles.map((s) => s.hash));
}
