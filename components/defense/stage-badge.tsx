import type { DefenseStage } from '@/lib/defense/schema';

export function StageBadge({ stage }: { stage: DefenseStage | string }) {
  const isFinal = stage === 'final';
  return (
    <span
      className={
        isFinal ? 'pill pill-destructive' : 'pill pill-info'
      }
    >
      {isFinal ? 'Final defense' : 'Synopsis defense'}
    </span>
  );
}
