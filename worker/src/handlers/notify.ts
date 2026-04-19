import type { Env } from "../env.js";
import { type Result, ok, err } from "../lib/errors.js";
import { NotifyInput, type NotifyItem } from "../lib/schemas.js";
import {
  ledgerHas, ledgerInsert, resolveRecipient, type NotificationKind,
} from "../lib/notifications.js";
import {
  resendSend, buildAssignmentMessage, buildDecisionMessage,
  buildDeskRejectMessage, buildRevisionRequestMessage,
} from "../lib/email.js";
import { genNotificationId } from "../lib/ids.js";

export type NotifyFailure = {
  kind: NotificationKind;
  target_id: string;
  recipient_user_id: string | null;
  reason: string;
};
export type NotifyOutput = {
  sent: number;
  skipped_dedupe: number;
  failed: NotifyFailure[];
};

export async function notify(
  env: Env,
  rawInput: unknown,
): Promise<Result<NotifyOutput>> {
  const parsed = NotifyInput.safeParse(rawInput);
  if (!parsed.success) return err("invalid_input", parsed.error.message);

  const expanded = expand(parsed.data.items);
  const out: NotifyOutput = { sent: 0, skipped_dedupe: 0, failed: [] };

  for (const e of expanded) {
    const recipient = await resolveRecipient(env, e.agent_id);
    if (!recipient) {
      out.failed.push({
        kind: e.kind, target_id: e.target_id,
        recipient_user_id: null, reason: "unknown_agent",
      });
      continue;
    }
    if (!recipient.email) {
      out.failed.push({
        kind: e.kind, target_id: e.target_id,
        recipient_user_id: recipient.user_id, reason: "no_email",
      });
      continue;
    }
    if (await ledgerHas(env, e.kind, e.target_id, recipient.user_id)) {
      out.skipped_dedupe++;
      continue;
    }
    const msg = buildMessage(env, e, recipient.email);
    const send = await resendSend(env, msg);
    if (!send.ok) {
      out.failed.push({
        kind: e.kind, target_id: e.target_id,
        recipient_user_id: recipient.user_id,
        reason: send.reason,
      });
      continue;
    }
    await ledgerInsert(env, {
      id: genNotificationId(),
      kind: e.kind,
      target_id: e.target_id,
      recipient_user_id: recipient.user_id,
      resend_id: send.resend_id ?? null,
    });
    out.sent++;
  }

  return ok(out);
}

type ExpandedItem =
  | { kind: "reviewer_assignment"; agent_id: string; target_id: string; paper_id: string; review_id: string; due_at: string }
  | { kind: "decision"; agent_id: string; target_id: string; paper_id: string; outcome: "accept" | "accept_with_revisions" | "major_revisions" | "reject" }
  | { kind: "desk_reject"; agent_id: string; target_id: string; paper_id: string }
  | { kind: "revision_request"; agent_id: string; target_id: string; paper_id: string };

function expand(items: NotifyItem[]): ExpandedItem[] {
  const out: ExpandedItem[] = [];
  for (const it of items) {
    switch (it.kind) {
      case "reviewer_assignment":
        out.push({
          kind: "reviewer_assignment",
          agent_id: it.reviewer_agent_id,
          target_id: it.review_id,
          paper_id: it.paper_id,
          review_id: it.review_id,
          due_at: it.due_at,
        });
        break;
      case "decision":
        for (const a of it.author_agent_ids) {
          out.push({
            kind: "decision",
            agent_id: a, target_id: it.paper_id,
            paper_id: it.paper_id, outcome: it.outcome,
          });
        }
        break;
      case "desk_reject":
        for (const a of it.author_agent_ids) {
          out.push({
            kind: "desk_reject",
            agent_id: a, target_id: it.paper_id, paper_id: it.paper_id,
          });
        }
        break;
      case "revision_request":
        for (const a of it.author_agent_ids) {
          out.push({
            kind: "revision_request",
            agent_id: a, target_id: it.paper_id, paper_id: it.paper_id,
          });
        }
        break;
    }
  }
  return out;
}

function buildMessage(env: Env, e: ExpandedItem, to: string) {
  switch (e.kind) {
    case "reviewer_assignment":
      return buildAssignmentMessage(env, {
        to, agentId: e.agent_id, paperId: e.paper_id,
        reviewId: e.review_id, dueAt: e.due_at,
      });
    case "decision":
      return buildDecisionMessage(env, { to, paperId: e.paper_id, outcome: e.outcome });
    case "desk_reject":
      return buildDeskRejectMessage(env, { to, paperId: e.paper_id });
    case "revision_request":
      return buildRevisionRequestMessage(env, { to, paperId: e.paper_id });
  }
}
