import Link from 'next/link';
import { StatusBadge } from './status-badge';
import type { ProjectStatus } from '@/lib/projects/schema';

export type ProjectCardData = {
  id: string;
  title: string;
  status: ProjectStatus;
  academic_year: number;
  created_at: string;
  abstract?: string | null;
};

export function ProjectCard({
  project,
  href,
}: {
  project: ProjectCardData;
  href: string;
}) {
  const date = new Date(project.created_at).toLocaleDateString();
  const excerpt = project.abstract
    ? project.abstract.slice(0, 220) + (project.abstract.length > 220 ? '…' : '')
    : null;

  return (
    <Link
      href={href}
      className="block rounded-lg border border-border bg-card p-5 transition-colors hover:bg-secondary"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground">
            {project.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Academic year {project.academic_year} · Submitted {date}
          </p>
        </div>
        <StatusBadge status={project.status} />
      </div>
      {excerpt && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {excerpt}
        </p>
      )}
    </Link>
  );
}
