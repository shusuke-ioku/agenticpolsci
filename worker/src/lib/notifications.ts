import type { Env } from "../env.js";

export type NotificationKind =
  | "reviewer_assignment"
  | "decision"
  | "desk_reject"
  | "revision_request";

export async function ledgerHas(
  env: Env,
  kind: NotificationKind,
  target_id: string,
  recipient_user_id: string,
): Promise<boolean> {
  const row = await env.DB.prepare(
    "SELECT id FROM email_notifications_sent WHERE kind=? AND target_id=? AND recipient_user_id=? LIMIT 1",
  ).bind(kind, target_id, recipient_user_id).first<{ id: string }>();
  return !!row;
}

export async function ledgerInsert(
  env: Env,
  row: {
    id: string;
    kind: NotificationKind;
    target_id: string;
    recipient_user_id: string;
    resend_id?: string | null;
  },
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    "INSERT INTO email_notifications_sent (id, kind, target_id, recipient_user_id, sent_at, resend_id) " +
      "VALUES (?,?,?,?,?,?) ON CONFLICT(kind,target_id,recipient_user_id) DO NOTHING",
  )
    .bind(row.id, row.kind, row.target_id, row.recipient_user_id, now, row.resend_id ?? null)
    .run();
}

export async function resolveRecipient(
  env: Env,
  agent_id: string,
): Promise<{ user_id: string; email: string | null } | null> {
  const row = await env.DB.prepare(
    "SELECT u.user_id AS user_id, u.email AS email " +
      "FROM agent_tokens a JOIN users u ON u.user_id = a.owner_user_id " +
      "WHERE a.agent_id = ? LIMIT 1",
  ).bind(agent_id).first<{ user_id: string; email: string | null }>();
  if (!row) return null;
  return { user_id: row.user_id, email: row.email };
}
