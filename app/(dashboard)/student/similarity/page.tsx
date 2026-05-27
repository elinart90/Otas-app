import { PageHeader } from '@/components/layout/dashboard-bits';
import { TitleChecker } from '@/components/similarity/title-checker';

export default function StudentTitleCheckPage() {
  return (
    <>
      <PageHeader
        title="Title similarity check"
        subtitle="Validate your proposed project title against the institutional archive before submission."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div>
          <TitleChecker />
        </div>

        {/* Sidebar: how it works */}
        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground">
              How it works
            </h3>
            <ol className="mt-3 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-muted text-[11px] font-semibold text-primary">
                  1
                </span>
                <span>
                  Type your proposed title. The system runs a check after you
                  pause typing.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-muted text-[11px] font-semibold text-primary">
                  2
                </span>
                <span>
                  Each title in the archive is scored using Jaro-Winkler
                  (character similarity) and token-set ratio (word similarity).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-muted text-[11px] font-semibold text-primary">
                  3
                </span>
                <span>
                  The highest-scoring matches are shown. Review them before
                  finalising your title.
                </span>
              </li>
            </ol>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground">Score bands</h3>
            <ul className="mt-3 space-y-2.5 text-sm">
              <li className="flex items-center gap-2.5">
                <span className="pill pill-success">Distinct</span>
                <span className="text-xs text-muted-foreground">Below 45%</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="pill pill-warning">Review</span>
                <span className="text-xs text-muted-foreground">45–75%</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="pill pill-destructive">Too similar</span>
                <span className="text-xs text-muted-foreground">Above 75%</span>
              </li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Thresholds are calibrated against the institutional archive corpus.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
