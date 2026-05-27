'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';

// react-pdf must be imported dynamically (SSR-incompatible)
const Document = dynamic(
  () => import('react-pdf').then((mod) => mod.Document),
  { ssr: false }
);
const Page = dynamic(() => import('react-pdf').then((mod) => mod.Page), {
  ssr: false,
});

/**
 * The viewer renders PDF pages to a canvas via react-pdf (PDF.js).
 *
 * Why canvas, not iframe:
 *   - An <iframe src=".pdf"> shows the browser's native PDF UI which
 *     includes a download button and a print button. Canvas rendering
 *     skips that entirely. The bytes never enter a "downloadable" surface.
 *
 * Why a watermark:
 *   - A visible viewer-identifying overlay deters screenshot exfiltration
 *     and provides accountability (the watermark stamps the viewer's name
 *     on every page).
 *
 * Why text-select disabled:
 *   - Prevents trivial copy-paste of large sections. The canvas itself
 *     does not expose text natively, so this is belt-and-braces.
 *
 * What this CANNOT do (honest at viva):
 *   - Prevent screenshots
 *   - Prevent screen recording
 *   - Stop devtools-savvy users from grabbing the bytes
 *   The system is institutional access control with audit logging, not DRM.
 */

export function PdfViewer({
  signedUrl,
  watermarkText,
}: {
  signedUrl: string;
  watermarkText: string;
}) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [width, setWidth] = useState(800);
  const [error, setError] = useState<string | null>(null);
  const [workerReady, setWorkerReady] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Configure the PDF.js worker exactly once. We do this client-side because
  // pdfjs-dist resolves differently in SSR vs browser.
  useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const pdfjs = await import('react-pdf');
      // Worker is served as a static asset from /public — see public/pdf.worker.min.mjs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (pdfjs as any).pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      if (!cancelled) setWorkerReady(true);
    } catch (e) {
      if (!cancelled) {
        setError(
          e instanceof Error ? e.message : 'Failed to load PDF viewer engine'
        );
      }
    }
  })();
  return () => {
    cancelled = true;
  };
}, []);

  // Responsively size pages to the container width
  useEffect(() => {
    function measure() {
      const w = containerRef.current?.clientWidth ?? 800;
      setWidth(Math.min(Math.max(w - 24, 320), 900));
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
        Failed to load viewer: {error}
      </div>
    );
  }

  if (!workerReady) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Initialising viewer…
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="select-none rounded-lg border border-border bg-card"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header controls */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="text-xs text-muted-foreground">
          Read-only viewer · watermarked
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            className={cn(
              'rounded-md border border-border bg-background px-3 py-1 text-xs transition-colors',
              pageNumber <= 1
                ? 'cursor-not-allowed opacity-40'
                : 'hover:bg-secondary'
            )}
          >
            ← Prev
          </button>
          <span className="tabular-nums text-muted-foreground">
            Page {pageNumber} of {numPages ?? '…'}
          </span>
          <button
            type="button"
            disabled={!numPages || pageNumber >= numPages}
            onClick={() =>
              setPageNumber((p) => Math.min(numPages ?? p, p + 1))
            }
            className={cn(
              'rounded-md border border-border bg-background px-3 py-1 text-xs transition-colors',
              !numPages || pageNumber >= numPages
                ? 'cursor-not-allowed opacity-40'
                : 'hover:bg-secondary'
            )}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Page area with watermark overlay */}
      <div className="relative flex justify-center bg-secondary/30 p-3">
        {/* Watermark — repeating diagonal text overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
        >
          <div className="rotate-[-22deg] select-none whitespace-nowrap text-[80px] font-bold uppercase tracking-widest text-foreground/[0.04]">
            {watermarkText}
          </div>
        </div>

        {/* The PDF page itself */}
        <Document
          file={signedUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={(err) =>
            setError(err instanceof Error ? err.message : 'PDF load error')
          }
          loading={
            <div className="p-10 text-center text-sm text-muted-foreground">
              Loading document…
            </div>
          }
          className="relative z-10"
        >
          <Page
            pageNumber={pageNumber}
            width={width}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="shadow-card"
          />
        </Document>
      </div>

      {/* Per-page watermark caption beneath each page */}
      <div className="border-t border-border bg-secondary/30 px-5 py-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
        Viewed by {watermarkText} · OTAS audit-logged
      </div>
    </div>
  );
}
