import { Clock, MailCheck, UserCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function SupervisorPendingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, email, department:department_id(name)')
    .eq('id', user?.id ?? '')
    .single();

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 text-center">

        {/* Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-warning/15">
          <Clock className="h-8 w-8 text-warning-foreground" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Pending approval, {firstName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your supervisor account has been created and is awaiting approval from the
            system administrator. You will be able to access your dashboard once approved.
          </p>
        </div>

        {/* Info cards */}
        <div className="space-y-3 text-left">
          <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-info" />
            <div>
              <p className="text-sm font-medium text-foreground">Registered email</p>
              <p className="text-xs text-muted-foreground">{profile?.email ?? '—'}</p>
            </div>
          </div>

          {profile?.department && (
            <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
              <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              <div>
                <p className="text-sm font-medium text-foreground">Department</p>
                <p className="text-xs text-muted-foreground">
                  {(profile.department as unknown as { name: string }).name}
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Contact your department administrator if you need urgent access.
          This page will automatically unlock once your account is approved.
        </p>
      </div>
    </div>
  );
}
