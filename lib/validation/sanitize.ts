/**
 * Phase 4 — shared input sanitization helpers.
 *
 * These are used inside Zod transforms across the various module-level
 * schemas (projects, archive, defense, supervisions). The goal is consistent
 * cleansing: trim, collapse internal whitespace, strip control characters.
 *
 * Why not just `z.string().trim()`? Because user-pasted content often
 * contains zero-width spaces, non-breaking spaces, double spaces, and
 * occasional control chars from copy-pasting out of Word documents.
 * These produce hard-to-debug DB CHECK violations downstream.
 */

const CONTROL_CHAR_RE = /[\u0000-\u001F\u007F\u200B-\u200D\uFEFF]/g;
const MULTI_WS_RE = /\s+/g;

/**
 * Trim, strip control characters, collapse internal whitespace to a single
 * space. Use for titles, names, venues, codes — anything single-line.
 */
export function sanitizeLine(input: string): string {
  return input.replace(CONTROL_CHAR_RE, '').replace(MULTI_WS_RE, ' ').trim();
}

/**
 * Trim, strip control characters, but preserve internal newlines and
 * indentation. Use for abstracts, comments, notes — anything multi-line.
 *
 * Collapses runs of 3+ consecutive blank lines down to 2, to suppress
 * "wall of empty lines" pastes.
 */
export function sanitizeBlock(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(CONTROL_CHAR_RE, (ch) => (ch === '\n' ? '\n' : ''))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Sanitize each item in a string array, drop any that becomes empty,
 * deduplicate case-insensitively, and bound the result. Use for keywords.
 */
export function sanitizeStringArray(
  arr: string[],
  options: { maxItems?: number; maxItemLen?: number } = {}
): string[] {
  const { maxItems = 10, maxItemLen = 40 } = options;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of arr) {
    const clean = sanitizeLine(raw).slice(0, maxItemLen);
    if (clean.length === 0) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length >= maxItems) break;
  }
  return out;
}
