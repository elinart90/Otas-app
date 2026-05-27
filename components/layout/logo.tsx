'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type LogoProps = {
  /** Pixel size of the emblem (height in px). */
  size?: number;
  /** When true, also renders the OTAS wordmark beside the emblem. */
  showWordmark?: boolean;
  /** Additional classes for the outer wrapper. */
  className?: string;
};

/**
 * UMaT-branded OTAS logo.
 * Tries to render the emblem from /public/umat-emblem.png (or .svg).
 * If the file is missing, falls back to a green emerald badge with "U" monogram.
 */
export function Logo({ size = 32, showWordmark = false, className }: LogoProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const width = Math.round(size / 1.26); // UMaT's 1:1.26 ratio

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {imgFailed ? (
        <span
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold"
          style={{
            width: width,
            height: size,
            fontSize: Math.round(size * 0.5),
          }}
          aria-hidden
        >
          U
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/umat-emblem.png"
          alt="UMaT emblem"
          width={width}
          height={size}
          onError={() => setImgFailed(true)}
          style={{ width, height: size, objectFit: 'contain' }}
        />
      )}

      {showWordmark && (
        <span className="flex flex-col leading-tight">
          <span className="text-base font-semibold tracking-tight text-foreground">
            OTAS
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            UMaT
          </span>
        </span>
      )}
    </span>
  );
}
