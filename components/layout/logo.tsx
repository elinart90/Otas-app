import Image from 'next/image';
import { cn } from '@/lib/utils';

type LogoProps = {
  /** Pixel height of the emblem. */
  size?: number;
  /** When true, renders the OTAS wordmark beside the emblem. */
  showWordmark?: boolean;
  /** Additional classes for the outer wrapper. */
  className?: string;
};

export function Logo({ size = 32, showWordmark = false, className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Image
        src="/umat-logo.jpg"
        alt="University of Mines and Technology emblem"
        width={size}
        height={size}
        className="object-contain"
      />

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
