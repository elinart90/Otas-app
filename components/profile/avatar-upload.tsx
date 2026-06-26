'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Camera, Loader2 } from 'lucide-react';

export function AvatarUpload({
  currentUrl,
  userName,
}: {
  currentUrl: string | null;
  userName: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const displayUrl = preview ?? currentUrl;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setPending(true);
    setError(null);

    const form = new FormData();
    form.append('avatar', file);

    const res = await fetch('/api/profile/avatar', { method: 'POST', body: form });
    const json = await res.json();

    setPending(false);

    if (!res.ok) {
      setError(json.error ?? 'Upload failed');
      return;
    }

    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
    router.refresh();
  }

  function handleCancel() {
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar circle */}
      <div className="relative">
        {displayUrl ? (
          <Image
            src={displayUrl}
            alt={userName}
            width={96}
            height={96}
            className="h-24 w-24 rounded-full object-cover ring-4 ring-border"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground ring-4 ring-border">
            {initials}
          </div>
        )}

        {/* Camera button */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-card hover:bg-primary/90 transition-colors"
          aria-label="Change avatar"
        >
          <Camera className="h-3.5 w-3.5" />
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}

      {preview && (
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={pending}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {pending && <Loader2 className="h-3 w-3 animate-spin" />}
            Save photo
          </button>
          <button
            onClick={handleCancel}
            disabled={pending}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-60 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
