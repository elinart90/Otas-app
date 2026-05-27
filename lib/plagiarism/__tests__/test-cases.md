# Plagiarism detection — algorithm design notes & test cases

This document records the design decisions for the intra-corpus plagiarism
detector in `../shingles.ts`, `../jaccard.ts`, and `../normalise.ts`. It is
referenced from the project report (Methodology chapter, section 4.3).

## Overview

The detector performs **intra-corpus** text similarity screening against the
institutional archive. It is **not** a replacement for commercial tools like
Turnitin which check against the open web. The specific problem it solves is
detection of UMaT students recycling prior UMaT projects — the highest-risk
source of duplication in an institutional archive setting.

## Algorithm: n-gram shingling + Jaccard similarity

The system follows the standard academic approach used by Stanford's MOSS
[Schleimer et al. 2003] and described in textbook treatments of duplicate
detection [Manning et al. 2008, Chapter 19].

### Pipeline

1. **Extract text** from uploaded PDF via `unpdf` (Deno-compatible).
2. **Normalise**: lowercase, strip punctuation, remove stop-words and
   tokens shorter than 2 characters.
3. **Shingle**: slide a window of `K = 5` consecutive tokens producing
   `N - K + 1` shingles for a document of `N` tokens.
4. **Hash** each shingle to a 32-bit integer using FNV-1a for compact
   storage and fast set operations.
5. **Compare** against each archived document's pre-computed fingerprint
   using Jaccard similarity: `|A ∩ B| / |A ∪ B|`.
6. **Locate passages**: contiguous runs of matching shingles in the
   student document are reported as matched passages with token offsets.
7. **Aggregate**: document-level coverage is the fraction of student
   tokens covered by at least one matched passage (de-duplicated across
   multiple matching archives).

### Why K = 5

Shingle size controls the false-positive / false-negative trade-off:

- `K = 2-3` produces false positives on common English bigrams ("the
  system uses", "with respect to").
- `K = 5-7` is the literature sweet spot; matches meaningful phrases
  without matching boilerplate.
- `K = 10+` only catches verbatim copy; trivial paraphrase escapes.

K is exposed as a single constant (`SHINGLE_SIZE` in `shingles.ts`) and
will be tuned in week 5 against the real archive corpus.

### Why Jaccard

- **Length-invariant**: a 50-page thesis vs a 5-page summary score
  correctly without normalisation hacks.
- **Order-invariant**: passages relocated to a different section still
  match.
- **Standard**: well-understood by examiners. Easy to defend at viva.

### Why FNV-1a hash

- 32-bit output: 16 bytes per shingle in storage, ~100KB per
  20-page document at K=5.
- Well-distributed: collision rate of ~1 in 4 billion at our shingle
  counts.
- No dependencies: pure-JS, runs in both Node and Deno (Edge Function).

## Document-level vs passage-level reporting

The system reports two metrics:

1. **Jaccard similarity** — overall set-based score per archive pair.
   Useful for ranking which archives are most worth reviewing.
2. **Coverage** — the fraction of the student's own document covered by
   ANY matched passage. This is the headline percentage shown to users.

Coverage is preferred for the UI because students intuitively understand
"X% of your document overlaps existing work" better than "Jaccard score
0.4" — and because coverage de-duplicates across archives.

## Test cases (5/5 passing)

| Case | Description | Expected | Result |
|------|-------------|----------|--------|
| Plagiarist vs target archive | Student doc with a verbatim lifted paragraph wrapped in original prose | Coverage ≥ 40% | **59.5%** ✓ |
| Plagiarist vs unrelated archive | Same student doc tested against a different archive on a different topic | Coverage ≤ 10% | **0.0%** ✓ |
| Original student vs archive | Genuinely original work on an unrelated topic | Coverage ≤ 10% | **0.0%** ✓ |
| Identical document Jaccard | Same document compared with itself | Jaccard ≥ 99% | **100%** ✓ |
| Identical document coverage | Same document compared with itself | Coverage ≥ 95% | **100%** ✓ |

The plagiarist case is the most important: it correctly identified the
lifted passage (token indices 7-28, an 18-shingle contiguous run) while
not flagging the original wrapping sentences before and after.

## What this system does NOT do

The defence script:

> "The OTAS plagiarism module performs intra-corpus text-similarity
> screening against the institutional archive using n-gram shingling and
> Jaccard similarity, following standard literature [Schleimer et al.
> 2003]. It is deliberately not a replacement for commercial tools like
> Turnitin which check against the open web; rather, it solves the
> specific institutional problem of detecting recycled prior UMaT
> projects. The system does not perform cross-language matching,
> semantic similarity via embeddings, or citation-aware exclusion —
> these are well-known extensions in the literature but out of scope for
> this work."

## References

- Schleimer, S., Wilkerson, D.S., Aiken, A. (2003). "Winnowing: local
  algorithms for document fingerprinting." Proc. SIGMOD, pp. 76-85.
- Manning, C.D., Raghavan, P., Schütze, H. (2008). *Introduction to
  Information Retrieval*, Chapter 19, "Web search basics — duplicate
  detection."
- Broder, A.Z. (1997). "On the resemblance and containment of
  documents." Proc. Compression and Complexity of Sequences.
- Fowler, G., Noll, L.C., Vo, K.-P. (1991). FNV hash function.
