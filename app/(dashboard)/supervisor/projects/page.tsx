import Link from 'next/link';
import { PageHeader, EmptyCard } from '@/components/layout/dashboard-bits';
import { StatusBadge } from '@/components/projects/status-badge';
import { createClient } from '@/lib/supabase/server';
import type { ProjectStatus } from '@/lib/projects/schema';

export const dynamic = 'force-dynamic';

type ProjectRow = {
  id: string;
  title: string;
  status: ProjectStatus;
  academic_year: number;
  created_at: string;
  author: { full_name: string; index_number: string | null } | null;
};

export default async function SupervisorProjectsList() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: projects, error } = await supabase
    .from('projects')
    .select(
      `id, title, status, academic_year, created_at,
       author:created_by(full_name, index_number)`
    )
    .eq('supervisor_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Students assigned to you for supervision."
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {!projects || projects.length === 0 ? (
        <EmptyCard
          title="No projects yet"
          body="When a student selects you as their supervisor and submits a proposal, the project will appear here."
        />
      ) : (
        <div className="space-y-3">
          {(projects as unknown as ProjectRow[]).map((p) => (
            <Link
              key={p.id}
              href={`/supervisor/projects/${p.id}`}
              className="block rounded-lg border border-border bg-card p-5 transition-colors hover:bg-secondary"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-foreground">
                    {p.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.academic_year}
                    {p.author?.full_name ? ` · ${p.author.full_name}` : ''}
                    {p.author?.index_number ? ` · ${p.author.index_number}` : ''}
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}