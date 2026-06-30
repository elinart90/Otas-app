import Link from 'next/link';

type ArchiveRow = {
  id: string;
  archive_code: string;
  document_url: string;
};

type MemberRow = {
  role_in_team: string;
  user: { full_name: string; index_number?: string | null } | null;
};

export type ArchiveCardData = {
  id: string;
  title: string;
  abstract: string | null;
  keywords: string[] | null;
  academic_year: number;
  group_id?: string | null;
  programme: { name: string; code: string } | null;
  author: { full_name: string } | null;
  members?: MemberRow | MemberRow[] | null;
  archives: ArchiveRow | ArchiveRow[] | null;
};

function memberNames(data: ArchiveCardData): string[] {
  if (!data.members) return data.author?.full_name ? [data.author.full_name] : [];
  const rows: MemberRow[] = Array.isArray(data.members) ? data.members : [data.members];
  // Sort: lead first, then members alphabetically
  const sorted = [...rows].sort((a, b) => {
    if (a.role_in_team === 'lead' && b.role_in_team !== 'lead') return -1;
    if (b.role_in_team === 'lead' && a.role_in_team !== 'lead') return 1;
    return (a.user?.full_name ?? '').localeCompare(b.user?.full_name ?? '');
  });
  const names = sorted.map((r) => r.user?.full_name).filter(Boolean) as string[];
  return names.length > 0 ? names : (data.author?.full_name ? [data.author.full_name] : []);
}

export function ArchiveCard({
  archive,
  hrefBase,
}: {
  archive: ArchiveCardData;
  hrefBase: string;
}) {
  const archiveRow: ArchiveRow | null = Array.isArray(archive.archives)
    ? archive.archives[0] ?? null
    : archive.archives ?? null;
  const code = archiveRow?.archive_code ?? '—';
  const hasDoc =
    !!archiveRow?.document_url &&
    !archiveRow.document_url.startsWith('placeholder://');
  const excerpt = archive.abstract
    ? archive.abstract.slice(0, 240) + (archive.abstract.length > 240 ? '…' : '')
    : null;

  const authors = memberNames(archive);
  const authorText = authors.length === 0
    ? null
    : authors.length <= 3
      ? authors.join(', ')
      : `${authors.slice(0, 2).join(', ')} +${authors.length - 2} more`;

  return (
    <Link
      href={`${hrefBase}/${archive.id}`}
      className="group block rounded-lg border border-border bg-card p-5 shadow-card transition-all duration-150 hover:border-primary/25 hover:shadow-elevated"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground transition-colors duration-150 group-hover:text-primary">
            {archive.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {archive.academic_year}
            {archive.programme?.code ? ` · ${archive.programme.code}` : ''}
            {authorText ? ` · ${authorText}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="pill pill-muted font-mono">{code}</span>
          {hasDoc ? (
            <span className="pill pill-success">PDF available</span>
          ) : (
            <span className="pill pill-warning">Metadata only</span>
          )}
        </div>
      </div>

      {excerpt && (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {excerpt}
        </p>
      )}

      {archive.keywords && archive.keywords.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {archive.keywords.slice(0, 6).map((k) => (
            <span
              key={k}
              className="inline-flex items-center rounded-full bg-primary-muted px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {k}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
