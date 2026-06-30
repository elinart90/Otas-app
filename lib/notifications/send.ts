/**
 * sendNotification — the single function every server action calls.
 * 1. Inserts a row into the notifications table (triggers Realtime bell)
 * 2. Looks up the recipient's email
 * 3. Sends an email via Resend (if RESEND_API_KEY is configured)
 * 4. Marks email_sent = true on success
 *
 * This function never throws — notification failures must not break
 * the primary action that triggered them.
 */

import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildEmailTemplate } from './templates';

type NotificationType =
  | 'group_leader_assigned'
  | 'group_created'
  | 'proposal_submitted'
  | 'proposal_approved'
  | 'proposal_rejected'
  | 'supervisor_approved'
  | 'supervisor_assigned'
  | 'defense_scheduled'
  | 'defense_result'
  | 'new_message';

type SendOptions = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  /** Extra data passed to email template builder */
  emailData?: Record<string, string | number | undefined>;
  /** Skip email for this notification (e.g. high-frequency new_message) */
  emailOnly?: boolean;
  skipEmail?: boolean;
};

const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

export async function sendNotification(opts: SendOptions): Promise<void> {
  const admin = createAdminClient();

  try {
    // 1. Insert notification row (triggers Realtime subscription on client)
    const { data: row, error: insertErr } = await admin
      .from('notifications')
      .insert({
        user_id: opts.userId,
        type: opts.type,
        title: opts.title,
        body: opts.body,
        link: opts.link ?? null,
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('[sendNotification] DB insert failed:', insertErr.message);
      return;
    }

    if (opts.skipEmail) return;

    // 2. Look up recipient email
    const { data: user } = await admin
      .from('users')
      .select('email, full_name')
      .eq('id', opts.userId)
      .single();

    if (!user?.email) return;

    // 3. Build and send email (only if Resend API key is configured)
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const { subject, html } = buildEmailTemplate(opts.type, {
      name: user.full_name,
      ...opts.emailData,
    });

    const resend = new Resend(apiKey);
    const { error: emailErr } = await resend.emails.send({
      from: `OTAS UMaT <${FROM}>`,
      to: [user.email],
      subject,
      html,
    });

    if (!emailErr && row?.id) {
      // 4. Mark email as sent
      await admin
        .from('notifications')
        .update({ email_sent: true })
        .eq('id', row.id);
    }

    if (emailErr) {
      console.error('[sendNotification] Resend error:', emailErr.message);
    }
  } catch (err) {
    console.error('[sendNotification] Unexpected error:', err);
  }
}

/**
 * Convenience: send the same notification to multiple users at once.
 */
export async function sendNotificationToMany(
  userIds: string[],
  opts: Omit<SendOptions, 'userId'>
): Promise<void> {
  await Promise.all(userIds.map((id) => sendNotification({ ...opts, userId: id })));
}
