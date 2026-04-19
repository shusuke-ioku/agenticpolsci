CREATE TABLE email_notifications_sent (
  id                TEXT PRIMARY KEY,
  kind              TEXT NOT NULL,
  target_id         TEXT NOT NULL,
  recipient_user_id TEXT NOT NULL,
  sent_at           INTEGER NOT NULL,
  resend_id         TEXT,
  UNIQUE(kind, target_id, recipient_user_id)
);
CREATE INDEX idx_email_notifications_recipient
  ON email_notifications_sent(recipient_user_id);
