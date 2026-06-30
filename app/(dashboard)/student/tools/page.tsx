import Link from 'next/link';
import { Search, ShieldCheck, Archive, GraduationCap, ArrowRight, Lock } from 'lucide-react';
import { PageHeader } from '@/components/layout/dashboard-bits';
import { createClient } from '@/lib/supabase/server';
import { getStudentLevelLabel } from '@/lib/student-level';

export const dynamic = 'force-dynamic';

const TOOLS = [
  {
    icon: Search,
    title: 'Title Similarity Check',
    body: 'Check if your proposed project title is too similar to existing titles in the archive before you submit.',
    href: '/student/title-check',
    tone: 'info',
  },
  {
    icon: ShieldCheck,
    title: 'Plagiarism Screening',
    body: 'Upload a document and compare it against the institutional archive to check for similarity.',
    href: '/student/plagiarism',
    tone: 'warning',
  },
  {
    icon: Archive,
    title: 'Browse Archive',
    body: 'Explore completed and approved projects from previous years to guide your own research.',
    href: '/archive',
    tone: 'success',
  },
];

const TONE_STYLES = {
  info:    { icon: 'bg-info/10 text-info',          border: 'hover:border-info/30' },
  warning: { icon: 'bg-warning/15 text-warning-foreground', border: 'hover:border-warning/30' },
  success: { icon: 'bg-success/10 text-success',    border: 'hover:border-success/30' },
};

export default async function StudentToolsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const indexNumber: string = user?.user_metadata?.index_number ?? '';
  const levelLabel = indexNumber ? getStudentLevelLabel(indexNumber) : null;

  return (
    <div className="space-y-8 p-6">
      <PageHeader
        title="Student Tools"
        subtitle={levelLabel ? `You are currently ${levelLabel}` : 'Quick access to academic tools'}
      />

      {/* Level notice */}
      <div className="flex items-start gap-3 rounded-xl border border-info/25 bg-info/5 p-4">
        <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-info" />
        <div>
          <p className="text-sm font-medium text-info">
            {levelLabel ?? 'Student'} — Limited access
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Full project submission, group management, and supervision features unlock automatically
            when you reach <strong>Level 400 (Final Year)</strong>. Use the tools below in the meantime.
          </p>
        </div>
      </div>

      {/* Tool cards */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Available Tools
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const style = TONE_STYLES[tool.tone as keyof typeof TONE_STYLES];
            return (
              <Link
                key={tool.title}
                href={tool.href}
                className={`group flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-card transition-all duration-150 hover:shadow-elevated ${style.border}`}
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.icon}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{tool.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tool.body}</p>
                </div>
                <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground">
                  Open <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Locked features preview */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Unlocks at Final Year
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            'Submit project proposal',
            'Create or join a project group',
            'Choose a supervisor',
            'Track supervision sessions',
            'View defense schedule & results',
          ].map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground"
            >
              <Lock className="h-4 w-4 shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
