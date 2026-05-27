'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader, EmptyCard } from '@/components/layout/dashboard-bits';
import { SearchFilters } from './search-filters';
import { ArchiveCard, type ArchiveCardData } from './archive-card';

type Programme = { id: string; name: string; code: string };

export function ArchiveBrowser({
  hrefBase,
}: {
  /** Where to send the user when they click a result (role-specific) */
  hrefBase: string;
}) {
  const [q, setQ] = useState('');
  const [year, setYear] = useState('');
  const [programmeId, setProgrammeId] = useState('');
  const [archives, setArchives] = useState<ArchiveCardData[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);

  // Debounced fetch on filter change
  const fetchArchives = useCallback(
    async (qVal: string, yVal: string, pVal: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (qVal) params.set('q', qVal);
        if (yVal) params.set('year', yVal);
        if (pVal) params.set('programme_id', pVal);
        const res = await fetch(`/api/archive?${params.toString()}`);
        const data = await res.json();
        if (data.ok) {
          setArchives(data.archives);
          setYears(data.years);
          setProgrammes(data.programmes);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchArchives('', '', '');
  }, [fetchArchives]);

  useEffect(() => {
    const t = setTimeout(() => fetchArchives(q, year, programmeId), 400);
    return () => clearTimeout(t);
  }, [q, year, programmeId, fetchArchives]);

  return (
    <>
      <PageHeader
        title="Archive"
        subtitle="Browse approved and archived projects."
      />

      <div className="space-y-4">
        <SearchFilters
          q={q}
          year={year}
          programmeId={programmeId}
          years={years}
          programmes={programmes}
          onChange={({ q: nq, year: ny, programmeId: np }) => {
            setQ(nq);
            setYear(ny);
            setProgrammeId(np);
          }}
        />

        {loading ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Searching…
          </div>
        ) : archives.length === 0 ? (
          <EmptyCard
            title="No matching archives"
            body={
              q || year || programmeId
                ? 'Try adjusting your filters.'
                : 'The institutional archive is empty.'
            }
          />
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {archives.length} {archives.length === 1 ? 'result' : 'results'}
            </p>
            <div className="space-y-3">
              {archives.map((a) => (
                <ArchiveCard key={a.id} archive={a} hrefBase={hrefBase} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
