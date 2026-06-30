/**
 * Utilities for detecting student academic level from their index number.
 * Index format: FOE.41.008.103.22  — last two digits = year admitted (20YY).
 * Level = (currentYear - admissionYear) × 100, capped at 400.
 * Final year = level 400 (≥ 4 years elapsed since admission).
 */

export function parseAdmissionYear(indexNumber: string): number | null {
  const match = indexNumber.match(/\.(\d{2})$/);
  if (!match) return null;
  return 2000 + parseInt(match[1], 10);
}

export function getYearsElapsed(indexNumber: string): number | null {
  const admYear = parseAdmissionYear(indexNumber);
  if (admYear === null) return null;
  return new Date().getFullYear() - admYear;
}

export function isFinalYear(indexNumber: string): boolean {
  const years = getYearsElapsed(indexNumber);
  return years !== null && years >= 4;
}

export function getStudentLevelLabel(indexNumber: string): string | null {
  const years = getYearsElapsed(indexNumber);
  if (years === null) return null;
  if (years >= 4) return 'Level 400 — Final Year';
  if (years === 3) return 'Level 300';
  if (years === 2) return 'Level 200';
  if (years === 1) return 'Level 100';
  return null;
}
