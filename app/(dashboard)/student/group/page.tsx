import Link from 'next/link';
import { Users, Crown, Clock, CheckCircle2, ArrowRight, UserCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/dashboard-bits';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function StudentGroupPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, index_number, is_group_leader, is_final_year')
    .eq('id', user.id)
    .single();

  const admin = createAdminClient();

  // Check if student is in a group already
  const { data: membership } = await admin
    .from('student_group_members')
    .select(`
      is_leader,
      group_id,
      student_groups (
        id, group_number, academic_year, created_at,
        supervisor:supervisor_id ( full_name )
      )
    `)
    .eq('user_id', user.id)
    .maybeSingle();

  // Check roster entry
  const { data: roster } = profile?.index_number
    ? await admin
        .from('admin_group_roster')
        .select('*')
        .contains('member_indexes', [profile.index_number])
        .maybeSingle()
    : { data: null };

  // If in a group, load all members
  let members: { full_name: string | null; index_number: string | null; is_leader: boolean }[] = [];
  if (membership?.group_id) {
    const { data: memberRows } = await admin
      .from('student_group_members')
      .select('is_leader, users(full_name, index_number)')
      .eq('group_id', membership.group_id);
    members = (memberRows ?? []).map((m) => ({
      full_name: (m.users as unknown as { full_name: string | null } | null)?.full_name ?? null,
      index_number: (m.users as unknown as { index_number: string | null } | null)?.index_number ?? null,
      is_leader: m.is_leader,
    }));
  }

  const group = membership?.student_groups as unknown as {
    id: string; group_number: number; academic_year: number; created_at: string;
    supervisor: { full_name: string } | null;
  } | null;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="My Group"
        subtitle="View your project group and members"
      />

      {/* ── Case 1: Already in a group ── */}
      {group ? (
        <div className="space-y-5">
          {/* Group header card */}
          <div className="rounded-xl border border-success/30 bg-success/5 p-6">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/15 text-success">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-success">Group Created</p>
                <h2 className="mt-1 text-2xl font-bold text-foreground">Group {group.group_number}</h2>
                <p className="text-sm text-muted-foreground">
                  Academic Year {group.academic_year} &bull; Created{' '}
                  {new Date(group.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {group.supervisor && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-background px-4 py-3 text-sm">
                <UserCircle className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Supervisor:</span>
                <span className="font-medium text-foreground">{group.supervisor.full_name}</span>
              </div>
            )}
          </div>

          {/* Members list */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold">Group Members</h3>
            <ul className="space-y-2">
              {members.map((m, i) => (
                <li key={i} className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {m.full_name ?? m.index_number ?? 'Unknown'}
                    </p>
                    {m.index_number && (
                      <p className="font-mono text-xs text-muted-foreground">{m.index_number}</p>
                    )}
                  </div>
                  {m.is_leader && (
                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      <Crown className="h-3 w-3" /> Leader
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : profile?.is_group_leader ? (
        /* ── Case 2: Leader, no group yet ── */
        <div className="space-y-5">
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-6">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Crown className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">You are a Group Leader</p>
                <h2 className="mt-1 text-xl font-bold text-foreground">Create your group</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  The admin has designated you as the group leader. Select your group number and
                  confirm your members to get started.
                </p>
              </div>
            </div>
            <Link
              href="/student/group/create"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <Users className="h-4 w-4" />
              Create group now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {roster && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <p className="mb-3 text-sm font-semibold">Your pre-assigned members</p>
              <ul className="space-y-2">
                {roster.member_indexes.map((idx: string, i: number) => (
                  <li key={idx} className="flex items-center gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="font-mono text-foreground">{idx}</span>
                    {i === 0 && (
                      <span className="text-xs font-semibold text-primary">(You)</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : roster ? (
        /* ── Case 3: Member, waiting for leader ── */
        <div className="rounded-xl border border-warning/25 bg-warning/5 p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/15 text-warning-foreground">
              <Clock className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-warning-foreground">Waiting</p>
              <h2 className="mt-1 text-xl font-bold text-foreground">Waiting for your group leader</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                You have been assigned to Group {roster.group_number}. Your group leader (
                <span className="font-mono text-foreground">{roster.leader_index}</span>) needs to
                log in and create the group. This page will update once that happens.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* ── Case 4: Not in any roster ── */
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-semibold text-foreground">No group assigned yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The administrator has not yet uploaded group rosters. Check back later.
          </p>
        </div>
      )}
    </div>
  );
}
