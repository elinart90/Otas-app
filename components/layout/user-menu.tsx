'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, User, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/rbac/permissions';

const ROLE_LABEL: Record<UserRole, string> = {
  student:    'Student',
  supervisor: 'Supervisor',
  panel:      'Panel member',
  hod:        'HoD / Coordinator',
  admin:      'Administrator',
};

export function UserMenu({
  userName,
  role,
  avatarUrl,
}: {
  userName: string;
  role: UserRole;
  avatarUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {/* Avatar */}
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={userName}
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-full object-cover shadow-sm"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">
            {initials}
          </div>
        )}

        {/* Name + role */}
        <div className="hidden sm:block text-left">
          <p className="text-sm font-semibold leading-tight text-foreground">{userName}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABEL[role]}</p>
        </div>

        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180'
          )}
          aria-hidden
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-48 rounded-xl border border-border bg-card shadow-lg py-1">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
          >
            <User className="h-4 w-4 text-muted-foreground" aria-hidden />
            Profile
          </Link>

          <Link
            href="/profile?tab=settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
          >
            <Settings className="h-4 w-4 text-muted-foreground" aria-hidden />
            Settings
          </Link>

          <div className="my-1 border-t border-border" />

          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
