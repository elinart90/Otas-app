/**
 * Text normalisation for plagiarism shingling.
 *
 * Goal: collapse formatting and trivial differences (case, punctuation,
 * extra whitespace, stop-words) so that two documents expressing the same
 * idea with the same content words produce overlapping shingles.
 *
 * Stop-words are stripped because they form long noise-shingles like
 * "the of the and the" that would match between any two English texts.
 */

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'being', 'by',
  'for', 'from', 'had', 'has', 'have', 'having', 'i', 'in', 'into', 'is',
  'it', 'its', 'of', 'on', 'or', 'that', 'the', 'this', 'these', 'those',
  'to', 'was', 'were', 'will', 'with', 'would', 'we', 'our', 'they', 'their',
  'he', 'she', 'his', 'her', 'them', 'us', 'you', 'your', 'do', 'does',
  'did', 'but', 'so', 'not', 'no', 'yes', 'also', 'than', 'then', 'when',
  'which', 'who', 'whom', 'where', 'why', 'how', 'what', 'while', 'about',
  'after', 'before', 'above', 'below', 'between', 'over', 'under',
]);

/**
 * Normalise raw text into a clean stream of content words.
 *
 * Steps:
 *   1. Lowercase
 *   2. Replace non-letter/digit characters with spaces
 *   3. Collapse whitespace
 *   4. Split into tokens
 *   5. Drop stop-words and very short tokens (< 2 chars)
 *
 * Returns an array of tokens in original order.
 */
export function normaliseText(raw: string): string[] {
  if (!raw) return [];
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

/**
 * Reconstruct a human-readable passage from a slice of tokens.
 * Used when displaying matched passages in the UI.
 */
export function tokensToReadable(tokens: string[]): string {
  return tokens.join(' ');
}
