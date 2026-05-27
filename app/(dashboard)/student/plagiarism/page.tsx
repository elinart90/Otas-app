'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/dashboard-bits';
import { Uploader } from '@/components/plagiarism/uploader';
import { ReportCard } from '@/components/plagiarism/report-card';
import { ReportDetail } from '@/components/plagiarism/report-detail';

type ReportRow = {
  id: string;
  document_name: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  overall_similarity: number | null;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
};

export default function StudentPlagiarismPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch('/api/plagiarism/reports');
      const data = await res.json();
      if (data.ok) setReports(data.reports);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Poll the reports list every 5s if any are still processing
  useEffect(() => {
    const hasActive = reports.some(
      (r) => r.status === 'queued' || r.status === 'processing'
    );
    if (!hasActive) return;
    const t = setInterval(fetchReports, 5000);
    return () => clearInterval(t);
  }, [reports, fetchReports]);

  function handleUploaded(reportId: string) {
    setSelectedId(reportId);
    fetchReports();
  }

  return (
    <>
      <PageHeader
        title="Plagiarism check"
        subtitle="Upload a summary or draft document to screen against the institutional archive."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Uploader onUploaded={handleUploaded} />

          {selectedId && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                Report
              </h2>
              <ReportDetail reportId={selectedId} />
            </section>
          )}
        </div>

        <aside>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Your recent checks
          </h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : reports.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No checks yet. Upload a PDF to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => (
                <ReportCard
                  key={r.id}
                  report={r}
                  isSelected={selectedId === r.id}
                  onSelect={() => setSelectedId(r.id)}
                />
              ))}
            </div>
          )}

          <div className="mt-5 rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">How it works</p>
            <p className="mt-2 leading-relaxed">
              Your PDF is extracted to text, split into 5-word rolling shingles,
              hashed, and compared against every archived project using Jaccard
              similarity. Matched passages show exactly which parts of your
              document overlap with existing work.
            </p>
            <p className="mt-3 leading-relaxed">
              This checks against the institutional archive only — not the open
              web. Use it to catch recycled content from past UMaT projects.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
