# Title similarity — algorithm design notes & test cases

This document records the key design decisions for the hybrid similarity
scorer in `../title-check.ts` and the test cases that drove those decisions.
It is referenced from the project report (Methodology chapter).

## Why a hybrid scorer

A title can be "similar" in two distinct ways:

1. **Character-similar** — typos, near-spellings.
   Example: `Online Libary Managment Sytsem` ≈ `Online Library Management System`
2. **Word-similar** — reordering, rewording, or stop-word noise.
   Example: `A Web-Based Student Records System` ≈ `Student Records System: A Web Application`

A pure character-level metric (Jaro-Winkler) catches case 1 but misses case 2.
A pure word-level metric (token-set ratio) catches case 2 but misses case 1.
Real fuzzy-matching libraries (e.g. fuzzywuzzy in Python) combine both.

## Why not simply `max(jw, ts)`

The naive hybrid `score = max(jaroWinkler, tokenSet)` was tested first and
**failed** on long unrelated titles. Two unrelated 30-character English titles
will share enough letter co-occurrence to score 0.5–0.6 on Jaro-Winkler,
giving false positives that drown the signal.

Empirical example:
```
"Hospital Patient Tracker"
vs
"Online Library Management System"
→ jw=0.566, ts=0.000  (with naive max → 0.566 = "review")
```

This is wrong: these titles share zero meaningful content. The "review"
banding would flood every student's title check with junk matches.

## The current decision tree

```
if jw >= 0.90 and ts is low      → score = jw          (typo escape hatch)
elif ts >= 0.60                  → score = max(jw, ts) (clear topic match)
elif ts >= 0.30                  → score = 0.7*ts + 0.3*jw (partial overlap)
else                             → score = ts          (suppress JW noise)
```

The **typo escape hatch** at jw≥0.90 is necessary because typo'd words
score zero in the token set (since each typo'd word fails to match its
correct counterpart in the set comparison). Without it, "Online Libary
Managment Sytsem" would score 0.14 — wrong.

The **suppression branch** at ts<0.3 is necessary because moderate JW
between unrelated long English strings is meaningless noise.

## Test cases (5/5 passing)

| Case | Proposed | Archived | jw | ts | score | band | expected |
|------|----------|----------|----|----|-------|------|----------|
| Identical | "Online Library Management System" | "Online Library Management System" | 1.000 | 1.000 | 1.000 | duplicate | duplicate ✓ |
| Typos | "Online Libary Managment Sytsem" | "Online Library Management System" | 0.951 | 0.143 | 0.951 | duplicate | duplicate ✓ |
| Reordered | "A Web-Based Student Records System" | "Student Records System: A Web Application" | 0.675 | 0.667 | 0.675 | review | review ✓ |
| Unrelated | "Hospital Patient Tracker" | "Online Library Management System" | 0.566 | 0.000 | 0.000 | original | original ✓ |
| Reorder+rewording | "AI for Healthcare Diagnosis" | "Healthcare AI Diagnosis System" | 0.744 | 0.750 | 0.750 | review | review ✓ |

## Thresholds

These are starting values from string-similarity literature, **not yet
calibrated against the UMaT archive corpus**. Calibration is week 5 work:

1. Build a corpus of 15-20 past UMaT projects + 2-3 known-similar pairs.
2. Run pairwise similarity across the corpus.
3. Sweep thresholds 0.50, 0.60, 0.70, 0.75, 0.80, 0.90 and measure
   precision and recall at each.
4. Pick the F1-optimal threshold; document the resulting confusion matrix.
5. Update `SIMILARITY_THRESHOLDS` in `title-check.ts` accordingly.

## References

- Jaro, M.A. (1989). "Advances in record-linkage methodology as applied to
  matching the 1985 census of Tampa, Florida." JASA 84(406), pp. 414-420.
- Winkler, W.E. (1990). "String comparator metrics and enhanced decision
  rules in the Fellegi-Sunter model of record linkage." Proceedings of the
  Section on Survey Research Methods, ASA, pp. 354-359.
- SeatGeek's `fuzzywuzzy` library — combined ratio implementation.
