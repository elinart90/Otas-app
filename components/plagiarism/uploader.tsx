'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  onUploaded: (reportId: string) => void;
};

export function Uploader({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setError(null);
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are accepted.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File exceeds 10 MB limit.');
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/plagiarism/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? 'Upload failed');
        return;
      }
      onUploaded(data.reportId);
    } catch (e: any) {
      setError(e?.message ?? 'Network error');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label
        htmlFor="plag-file"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) uploadFile(f);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors',
          dragging
            ? 'border-primary bg-primary-muted'
            : 'border-border bg-card hover:border-primary/40 hover:bg-secondary'
        )}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-muted-foreground"
        >
          <path d="M12 3v12M6 9l6-6 6 6M5 21h14" />
        </svg>
        <div>
          <p className="text-sm font-medium text-foreground">
            {uploading ? 'Uploading…' : 'Drop your PDF here or click to browse'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Maximum 10 MB. Text-based PDFs only (scanned images won't work).
          </p>
        </div>
        <input
          ref={inputRef}
          id="plag-file"
          type="file"
          accept="application/pdf"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadFile(f);
            e.target.value = ''; // allow re-upload of same file
          }}
        />
      </label>

      {error && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
