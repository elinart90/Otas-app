-- ============================================================================
-- Migration 018: Notifications table
-- Central store for both in-app bell and email events.
-- ============================================================================

CREATE TYPE notification_type AS ENUM (
  'group_leader_assigned',
  'group_created',
  'proposal_submitted',
  'proposal_approved',
  'proposal_rejected',
  'supervisor_approved',
  'supervisor_assigned',
  'defense_scheduled',
  'defense_result',
  'new_message'
);

CREATE TABLE notifications (
  id          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       TEXT             NOT NULL,
  body        TEXT             NOT NULL,
  link        TEXT,                          -- optional deep-link inside the app
  is_read     BOOLEAN          NOT NULL DEFAULT FALSE,
  email_sent  BOOLEAN          NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- Fast look-ups: unread count per user, and bell dropdown
CREATE INDEX idx_notifications_user_unread
  ON notifications (user_id, is_read, created_at DESC)
  WHERE is_read = FALSE;

CREATE INDEX idx_notifications_user_recent
  ON notifications (user_id, created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Each user can only see and update their own notifications
CREATE POLICY "notifications_own_read" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_own_update" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Service-role (used by sendNotification helper) can insert freely
-- No INSERT policy needed — admin client bypasses RLS
