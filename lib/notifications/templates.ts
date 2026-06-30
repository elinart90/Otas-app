/**
 * Email HTML templates for each notification type.
 * Returns { subject, html } for a given type and data payload.
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

function layout(body: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OTAS Notification</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr>
          <td style="background:#0e3d28;padding:20px 32px;">
            <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">OTAS</span>
            <span style="color:#ffffff66;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:2px;margin-left:10px;">UMaT</span>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:32px;">${body}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;color:#9ca3af;font-size:12px;">
            University of Mines and Technology · Tarkwa, Ghana<br/>
            This is an automated message from OTAS.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:20px;background:#0e3d28;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">${label}</a>`;
}

function heading(text: string): string {
  return `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">${text}</h2>`;
}

function para(text: string): string {
  return `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151;">${text}</p>`;
}

// ── Template map ────────────────────────────────────────────────────────────
type TemplateData = Record<string, string | number | undefined>;

export function buildEmailTemplate(
  type: string,
  data: TemplateData
): { subject: string; html: string } {
  switch (type) {
    case 'group_leader_assigned':
      return {
        subject: 'You have been assigned as a Group Leader — OTAS',
        html: layout(`
          ${heading('You are a Group Leader')}
          ${para(`Hi ${data.name ?? 'there'},`)}
          ${para(`The administrator has designated you as the leader of a project group. Log in to OTAS to create your group, select a group number, and confirm your members.`)}
          ${btn('Create Your Group', `${BASE_URL}/student/group`)}
        `),
      };

    case 'group_created':
      return {
        subject: `Group ${data.groupNumber} has been created — OTAS`,
        html: layout(`
          ${heading(`You've been added to Group ${data.groupNumber}`)}
          ${para(`Hi ${data.name ?? 'there'},`)}
          ${para(`Your group leader has created Group <strong>${data.groupNumber}</strong> for the ${data.academicYear} cohort. You can view your group details by logging into OTAS.`)}
          ${btn('View My Group', `${BASE_URL}/student/group`)}
        `),
      };

    case 'proposal_submitted':
      return {
        subject: `New proposal awaiting your review — OTAS`,
        html: layout(`
          ${heading('New Project Proposal')}
          ${para(`Hi ${data.name ?? 'there'},`)}
          ${para(`A student has submitted a project proposal for your review:`)}
          ${para(`<strong>"${data.title}"</strong>`)}
          ${para(`Please log in to OTAS to review and approve or reject the proposal.`)}
          ${btn('Review Proposal', `${BASE_URL}/supervisor/projects`)}
        `),
      };

    case 'proposal_approved':
      return {
        subject: 'Your project proposal has been approved — OTAS',
        html: layout(`
          ${heading('Proposal Approved ✓')}
          ${para(`Hi ${data.name ?? 'there'},`)}
          ${para(`Great news! Your project proposal <strong>"${data.title}"</strong> has been approved by your supervisor. Supervision sessions can now begin.`)}
          ${btn('View Project', `${BASE_URL}/student/project`)}
        `),
      };

    case 'proposal_rejected':
      return {
        subject: 'Your project proposal needs revision — OTAS',
        html: layout(`
          ${heading('Proposal Needs Revision')}
          ${para(`Hi ${data.name ?? 'there'},`)}
          ${para(`Your project proposal <strong>"${data.title}"</strong> has been returned for revision. Please review the feedback from your supervisor and resubmit.`)}
          ${btn('View Feedback', `${BASE_URL}/student/project`)}
        `),
      };

    case 'supervisor_approved':
      return {
        subject: 'Your supervisor account has been approved — OTAS',
        html: layout(`
          ${heading('Account Approved ✓')}
          ${para(`Hi ${data.name ?? 'there'},`)}
          ${para(`Your supervisor account on OTAS has been approved by the administrator. You can now log in and access your dashboard.`)}
          ${btn('Go to Dashboard', `${BASE_URL}/supervisor`)}
        `),
      };

    case 'supervisor_assigned':
      return {
        subject: `Supervisor assigned to Group ${data.groupNumber} — OTAS`,
        html: layout(`
          ${heading(`Supervisor Assigned to Group ${data.groupNumber}`)}
          ${para(`Hi ${data.name ?? 'there'},`)}
          ${para(`<strong>${data.supervisorName}</strong> has been assigned as the supervisor for Group <strong>${data.groupNumber}</strong>.`)}
          ${btn('View Group', `${BASE_URL}/student/group`)}
        `),
      };

    case 'defense_scheduled':
      return {
        subject: `Defense session scheduled — OTAS`,
        html: layout(`
          ${heading('Defense Session Scheduled')}
          ${para(`Hi ${data.name ?? 'there'},`)}
          ${para(`A <strong>${data.stage}</strong> defense session has been scheduled for your project on <strong>${data.date}</strong> at <strong>${data.venue}</strong>.`)}
          ${btn('View Details', `${BASE_URL}/student`)}
        `),
      };

    default:
      return {
        subject: 'New notification from OTAS',
        html: layout(`
          ${heading(data.title as string ?? 'Notification')}
          ${para(data.body as string ?? '')}
          ${data.link ? btn('Open', `${BASE_URL}${data.link}`) : ''}
        `),
      };
  }
}
