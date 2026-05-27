import Link from 'next/link';
import { PageHeader, EmptyCard } from '@/components/layout/dashboard-bits';
import { ProjectCard } from '@/components/projects/proposal-card';
import { createClient } from '@/lib/supabase/server';
import type { ProjectStatus } from '@/lib/projects/schema';

export const dynamic = 'force-dynamic';

export default async function StudentProjectPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, abstract, status, academic_year, created_at')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });

  const list = projects ?? [];

  return (
    <>
      <PageHeader
        title="My project"
        subtitle="Your current and past project submissions."
        action={
          list.length === 0 ? (
            <Link
              href="/student/project/new"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Submit a proposal
            </Link>
          ) : undefined
        }
      />

      {list.length === 0 ? (
        <EmptyCard
          title="No project yet"
          body="Submit a proposal to begin. Your title will be checked against the institutional archive in real time."
          action={
            <Link
              href="/student/project/new"
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Start a proposal
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {list.map((p) => (
            <ProjectCard
              key={p.id}
              project={p as { id: string; title: string; status: ProjectStatus; academic_year: number; created_at: string; abstract: string | null }}
              href={`/student/project/${p.id}`}
            />
          ))}
        </div>
      )}
    </>
  );
}
