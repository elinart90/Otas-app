'use client';

type ReportRow = {
  id: string;
  document_name: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  overall_similarity: number | null;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
};

function statusPill(status: ReportRow['status']) {
  switch (status) {
    case 'queued':
      return <span className="pill pill-info">Queued</span>;
    case 'processing':
      return <span className="pill pill-warning">Processing…</span>;
    case 'completed':
      return <span className="pill pill-success">Complete</span>;
    case 'failed':
      return <span className="pill pill-destructive">Failed</span>;
  }
}

function scoreBand(score: number) {
  const pct = Math.round(score * 100);
  if (score < 0.15) return { label: 'Original', pill: 'pill pill-success', pct };
  if (score < 0.35) return { label: 'Review', pill: 'pill pill-warning', pct };
  return { label: 'High overlap', pill: 'pill pill-destructive', pct };
}

export function ReportCard({
  report,
  isSelected,
  onSelect,
}: {
  report: ReportRow;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isProcessing = report.status === 'queued' || report.status === 'processing';
  const date = new Date(report.created_at).toLocaleString();

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-md border bg-card p-4 text-left transition-colors ${
        isSelected
          ? 'border-primary bg-primary-muted'
          : 'border-border hover:bg-secondary'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {report.document_name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{date}</p>
        </div>
        {statusPill(report.status)}
      </div>

      {report.status === 'completed' && report.overall_similarity !== null && (
        <div className="mt-3 flex items-center justify-between">
          <span className={scoreBand(report.overall_similarity).pill}>
            {scoreBand(report.overall_similarity).label}
          </span>
          <span className="text-lg font-semibold tabular-nums text-foreground">
            {scoreBand(report.overall_similarity).pct}%
          </span>
        </div>
      )}

      {report.status === 'failed' && report.error_message && (
        <p className="mt-2 text-xs text-destructive">{report.error_message}</p>
      )}

      {isProcessing && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 animate-pulse bg-info" />
        </div>
      )}
    </button>
  );
}
