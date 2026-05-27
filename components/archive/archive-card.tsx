import Link from 'next/link';

// Supabase can return joined relationships as either an array OR a single
// object depending on cardinality inference. Type both shapes here.
type ArchiveRow = {
  id: string;
  archive_code: string;
  document_url: string;
};

export type ArchiveCardData = {
  id: string;
  title: string;
  abstract: string | null;
  keywords: string[] | null;
  academic_year: number;
  programme: { name: string; code: string } | null;
  author: { full_name: string } | null;
  archives: ArchiveRow | ArchiveRow[] | null;
};

export function ArchiveCard({
  archive,
  hrefBase,
}: {
  archive: ArchiveCardData;
  hrefBase: string;
}) {
  // Normalise the archives shape: Supabase returns it as either an object
  // or a single-element array depending on relationship cardinality.
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

  return (
    <Link
      href={`${hrefBase}/${archive.id}`}
      className="block rounded-lg border border-border bg-card p-5 transition-colors hover:bg-secondary"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground">
            {archive.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {archive.academic_year}
            {archive.programme?.code ? ` · ${archive.programme.code}` : ''}
            {archive.author?.full_name ? ` · ${archive.author.full_name}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="pill pill-muted">{code}</span>
          {hasDoc ? (
            <span className="pill pill-success">PDF available</span>
          ) : (
            <span className="pill pill-warning">Metadata only</span>
          )}
        </div>
      </div>

      {excerpt && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {excerpt}
        </p>
      )}

      {archive.keywords && archive.keywords.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {archive.keywords.slice(0, 6).map((k) => (
            <span
              key={k}
              className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground"
            >
              {k}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}