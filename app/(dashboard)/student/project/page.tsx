import Link from 'next/link';
import { PageHeader, EmptyCard } from '@/components/layout/dashboard-bits';
import { ProjectCard } from '@/components/projects/proposal-card';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ProjectStatus } from '@/lib/projects/schema';

export const dynamic = 'force-dynamic';

export default async function StudentProjectPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminDb = createAdminClient();

  // Find all project IDs this student is a member of
  const { data: memberOf } = await adminDb
    .from('project_members')
    .select('project_id')
    .eq('user_id', user.id);

  const projectIds = (memberOf ?? []).map((m) => m.project_id);

  const list: Array<{
    id: string;
    title: string;
    abstract: string | null;
    status: ProjectStatus;
    academic_year: number;
    created_at: string;
  }> = [];

  if (projectIds.length > 0) {
    const { data: projects } = await supabase
      .from('projects')
      .select('id, title, abstract, status, academic_year, created_at')
      .in('id', projectIds)
      .order('created_at', { ascending: false });
    list.push(...((projects ?? []) as typeof list));
  }

  // Check if student is a group leader (allowed to submit)
  const { data: membership } = await adminDb
    .from('student_group_members')
    .select('is_leader')
    .eq('user_id', user.id)
    .maybeSingle();
  const isLeader = membership?.is_leader === true;

  const canSubmit = isLeader && list.length === 0;

  return (
    <>
      <PageHeader
        title="Group project"
        subtitle="Your group's project proposal and submission."
        action={
          canSubmit ? (
            <Link
              href="/student/project/new"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Submit proposal
            </Link>
          ) : undefined
        }
      />

      {list.length === 0 ? (
        <EmptyCard
          title="No group project yet"
          body={
            isLeader
              ? 'As group leader, submit a proposal on behalf of your group.'
              : 'Your group has not submitted a proposal yet. Only the group leader can submit.'
          }
          action={
            isLeader ? (
              <Link
                href="/student/project/new"
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Submit proposal
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {!isLeader && (
            <p className="rounded-lg border border-info/30 bg-info/10 px-4 py-3 text-sm text-info-foreground">
              This proposal was submitted by your group leader. All group members share this project.
            </p>
          )}
          {list.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              href={`/student/project/${p.id}`}
            />
          ))}
        </div>
      )}
    </>
  );
}
