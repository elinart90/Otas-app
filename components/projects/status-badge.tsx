import type { ProjectStatus } from '@/lib/projects/schema';

type Tone = 'muted' | 'info' | 'warning' | 'success' | 'destructive';

const STATUS_META: Record<ProjectStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'muted' },
  proposal_submitted: { label: 'Awaiting supervisor', tone: 'info' },
  proposal_approved: { label: 'Proposal approved', tone: 'success' },
  proposal_rejected: { label: 'Proposal rejected', tone: 'destructive' },
  in_supervision: { label: 'In supervision', tone: 'info' },
  synopsis_scheduled: { label: 'Synopsis scheduled', tone: 'warning' },
  synopsis_passed: { label: 'Synopsis passed', tone: 'success' },
  synopsis_failed: { label: 'Synopsis failed', tone: 'destructive' },
  final_scheduled: { label: 'Final scheduled', tone: 'warning' },
  final_passed: { label: 'Final passed', tone: 'success' },
  final_failed: { label: 'Final failed', tone: 'destructive' },
  archived: { label: 'Archived', tone: 'muted' },
};

export function StatusBadge({ status }: { status: ProjectStatus | string }) {
  const meta =
    STATUS_META[status as ProjectStatus] ?? { label: status, tone: 'muted' as Tone };
  return <span className={`pill pill-${meta.tone}`}>{meta.label}</span>;
}
