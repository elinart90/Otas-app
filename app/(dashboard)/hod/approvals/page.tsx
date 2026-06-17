import Link from 'next/link';
import { PageHeader, EmptyCard } from '@/components/layout/dashboard-bits';
import { StatusBadge } from '@/components/projects/status-badge';
import { DecisionForm } from '@/components/projects/decision-form';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type ProjectRow = {
  id: string;
  title: string;
  abstract: string | null;
  keywords: string[] | null;
  academic_year: number;
  created_at: string;
  author: { full_name: string; index_number: string | null; email: string } | null;
  supervisor: { full_name: string; email: string } | null;
};

export default async function HodApprovalsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: projects, error } = await supabase
    .from('projects')
    .select(
      `id, title, abstract, keywords, academic_year, created_at,
       author:created_by(full_name, index_number, email),
       supervisor:supervisor_id(full_name, email)`
    )
    .eq('status', 'proposal_submitted')
    .order('created_at', { ascending: true });

  const rows = (projects ?? []) as unknown as ProjectRow[];

  return (
    <>
      <PageHeader
        title="Proposal approvals"
        subtitle="All proposals awaiting supervisor or HoD review, oldest first."
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyCard
          title="No pending proposals"
          body="All proposals have been reviewed. New submissions will appear here."
        />
      ) : (
        <div className="space-y-5">
          {rows.map((p) => (
            <article
              key={p.id}
              className="rounded-lg border border-border bg-card p-5 shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-foreground">
                    {p.title}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>Academic year {p.academic_year}</span>
                    {p.author?.full_name && <span>{p.author.full_name}</span>}
                    {p.author?.index_number && <span>{p.author.index_number}</span>}
                    {p.supervisor?.full_name && (
                      <span>Supervisor: {p.supervisor.full_name}</span>
                    )}
                  </div>
                </div>
                <StatusBadge status="proposal_submitted" />
              </div>

              {p.abstract && (
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {p.abstract}
                </p>
              )}

              {p.keywords && p.keywords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.keywords.map((k) => (
                    <span
                      key={k}
                      className="inline-flex items-center rounded-full bg-primary-muted px-2 py-0.5 text-xs font-medium text-primary"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              )}

              <p className="mt-2 text-xs text-muted-foreground">
                Submitted {new Date(p.created_at).toLocaleDateString()}
              </p>

              <div className="mt-4">
                <DecisionForm projectId={p.id} title="HoD decision" />
              </div>

              <div className="mt-3">
                <Link
                  href={`/hod/approvals/${p.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  View full proposal →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
