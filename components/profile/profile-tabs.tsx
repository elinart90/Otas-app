'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AvatarUpload } from './avatar-upload';
import { ProfileInfo } from './profile-info';
import { PasswordForm } from './password-form';
import type { UserRole } from '@/lib/rbac/permissions';
import { Shield, User, Settings } from 'lucide-react';

type ProfileData = {
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  index_number: string | null;
  staff_id: string | null;
  is_active: boolean;
  created_at: string;
  avatar_url: string | null;
  departments: { name: string; code: string } | null;
  programmes: { name: string; code: string } | null;
};

const TABS = [
  { key: 'profile',  label: 'Profile',  icon: User    },
  { key: 'security', label: 'Security', icon: Shield  },
  { key: 'settings', label: 'Settings', icon: Settings },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function ProfileTabs({ profile }: { profile: ProfileData }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const active = (searchParams.get('tab') ?? 'profile') as TabKey;

  function setTab(tab: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/profile?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              active === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {active === 'profile' && (
        <div className="flex flex-col gap-8">
          {/* Avatar */}
          <div className="flex justify-center">
            <AvatarUpload currentUrl={profile.avatar_url} userName={profile.full_name} />
          </div>

          {/* Info grid */}
          <ProfileInfo profile={profile} />
        </div>
      )}

      {active === 'security' && (
        <div className="max-w-md space-y-4">
          <h2 className="text-base font-semibold text-foreground">Account security</h2>
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Email address
              </span>
              <span className="text-sm text-foreground">{profile.email}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Authentication
              </span>
              <span className="text-sm text-foreground">Email and password</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Account status
              </span>
              <span className={`text-sm font-medium ${profile.is_active ? 'text-emerald-600' : 'text-destructive'}`}>
                {profile.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Member since
              </span>
              <span className="text-sm text-foreground">
                {new Date(profile.created_at).toLocaleDateString('en-GB', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      )}

      {active === 'settings' && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">Change password</h2>
          <PasswordForm />
        </div>
      )}
    </div>
  );
}
