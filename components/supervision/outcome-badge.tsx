import type { SupervisionOutcome } from '@/lib/supervision/schema';
import { OUTCOME_LABEL } from '@/lib/supervision/schema';

const OUTCOME_TONE: Record<SupervisionOutcome, string> = {
  excellent: 'pill pill-success',
  on_track: 'pill pill-info',
  needs_attention: 'pill pill-warning',
  concern: 'pill pill-destructive',
};

export function OutcomeBadge({ outcome }: { outcome: SupervisionOutcome | string }) {
  const safe = (OUTCOME_LABEL as Record<string, string>)[outcome]
    ? (outcome as SupervisionOutcome)
    : 'on_track';
  return (
    <span className={OUTCOME_TONE[safe]}>{OUTCOME_LABEL[safe]}</span>
  );
}
