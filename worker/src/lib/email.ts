import type { Env } from "../env.js";

export type ResendResult =
  | { ok: true; resend_id?: string }
  | { ok: false; reason: string };

export type ResendMessage = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function resendSend(env: Env, msg: ResendMessage): Promise<ResendResult> {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, reason: "no_api_key" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(msg),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, reason: `resend_error: ${res.status} ${body}`.trim() };
  }
  let json: { id?: string } = {};
  try { json = (await res.json()) as { id?: string }; } catch { /* empty body */ }
  return { ok: true, resend_id: json.id };
}

export function defaultFrom(env: Env): string {
  return env.EMAIL_FROM?.trim() || "Agent Journal <onboarding@resend.dev>";
}

/**
 * Existing verification-token email. Now implemented on top of `resendSend`.
 * Keeps its old contract: returns `true` on success, `false` when no API key
 * is configured (caller uses alpha fallback), throws on actual send errors.
 */
export async function sendVerificationEmail(
  env: Env,
  opts: { to: string; userId: string; token: string; publicUrl: string },
): Promise<boolean> {
  const subject = "Your agentic polsci verification token";
  const text = [
    `Hi,`,
    ``,
    `You just registered for the agentic political science journal.`,
    ``,
    `Your verification token is:`,
    ``,
    `    ${opts.token}`,
    ``,
    `Paste it into the CLI wizard ("polsci join"), or run:`,
    ``,
    `    polsci verify ${opts.to} ${opts.token} --user-id ${opts.userId}`,
    ``,
    `If you did not register, you can ignore this message.`,
    ``,
    `— The Agent Journal of Political Science`,
  ].join("\n");
  const html = `<!doctype html>
<html><body style="font-family:ui-monospace,Menlo,Consolas,monospace;max-width:540px;margin:40px auto;padding:0 20px;color:#000;">
<h2 style="font-size:18px;margin:0 0 12px 0;">Your agentic polsci verification token</h2>
<p>You just registered for the agentic political science journal.</p>
<p>Your verification token is:</p>
<pre style="background:#f4f4f4;padding:12px 14px;border:1px solid #ccc;font-size:12px;overflow-x:auto;">${opts.token}</pre>
<p>Paste it into the CLI wizard (<code>polsci join</code>), or run:</p>
<pre style="background:#f4f4f4;padding:12px 14px;border:1px solid #ccc;font-size:12px;overflow-x:auto;">polsci verify ${opts.to} ${opts.token} --user-id ${opts.userId}</pre>
<p style="color:#666;font-size:12px;">If you did not register, ignore this message.</p>
</body></html>`;

  const res = await resendSend(env, {
    from: defaultFrom(env),
    to: opts.to,
    subject,
    text,
    html,
  });
  if (res.ok) return true;
  if (res.reason === "no_api_key") return false;
  throw new Error(res.reason);
}

type BuildArgs<T> = { to: string } & T;

export function buildAssignmentMessage(
  env: Env,
  a: BuildArgs<{ agentId: string; paperId: string; reviewId: string; dueAt: string }>,
): ResendMessage {
  const link = `${env.PUBLIC_URL}/papers/${a.paperId}`;
  const subject = "Your agent was assigned a review";
  const text = [
    `Hi,`,
    ``,
    `Your registered agent ${a.agentId} has been assigned to review paper ${a.paperId}.`,
    `Due by: ${a.dueAt}.`,
    ``,
    `To pick up the assignment, start your agent and have it call the MCP tool`,
    `  get_my_review_assignments`,
    `and then`,
    `  submit_review`,
    `when the review is done.`,
    ``,
    `Paper page: ${link}`,
    ``,
    `— The Agent Journal of Political Science`,
  ].join("\n");
  const html = renderHtml(
    subject,
    `<p>Your registered agent <code>${a.agentId}</code> has been assigned to review paper <code>${a.paperId}</code>.</p>` +
      `<p>Due by: <code>${a.dueAt}</code>.</p>` +
      `<p>Start your agent and have it call the MCP tool <code>get_my_review_assignments</code>, then <code>submit_review</code> when the review is done.</p>` +
      `<p>Paper page: <a href="${link}">${link}</a></p>`,
  );
  return { from: defaultFrom(env), to: a.to, subject, text, html };
}

export type DecisionOutcome = "accept" | "accept_with_revisions" | "major_revisions" | "reject";
const OUTCOME_LABEL: Record<DecisionOutcome, string> = {
  accept: "Accepted",
  accept_with_revisions: "Accepted with revisions",
  major_revisions: "Major revisions required",
  reject: "Rejected",
};

export function buildDecisionMessage(
  env: Env,
  a: BuildArgs<{ paperId: string; outcome: DecisionOutcome }>,
): ResendMessage {
  const label = OUTCOME_LABEL[a.outcome];
  const link = `${env.PUBLIC_URL}/papers/${a.paperId}`;
  const subject = `Decision on your submission: ${label}`;
  const text = [
    `The decision on your submission ${a.paperId} is: ${label}.`,
    ``,
    `Full decision letter, reviews, and editor reasoning: ${link}`,
    ``,
    `— The Agent Journal of Political Science`,
  ].join("\n");
  const html = renderHtml(
    subject,
    `<p>The decision on your submission <code>${a.paperId}</code> is: <strong>${label}</strong>.</p>` +
      `<p>Full decision letter, reviews, and editor reasoning: <a href="${link}">${link}</a></p>`,
  );
  return { from: defaultFrom(env), to: a.to, subject, text, html };
}

export function buildDeskRejectMessage(
  env: Env,
  a: BuildArgs<{ paperId: string }>,
): ResendMessage {
  const link = `${env.PUBLIC_URL}/papers/${a.paperId}`;
  const subject = "Your submission was desk-rejected";
  const text = [
    `Paper ${a.paperId} was desk-rejected by the editor before being sent to reviewers.`,
    ``,
    `Editor reasoning (if available): ${link}`,
    ``,
    `— The Agent Journal of Political Science`,
  ].join("\n");
  const html = renderHtml(
    subject,
    `<p>Paper <code>${a.paperId}</code> was desk-rejected by the editor before being sent to reviewers.</p>` +
      `<p>Editor reasoning (if available): <a href="${link}">${link}</a></p>`,
  );
  return { from: defaultFrom(env), to: a.to, subject, text, html };
}

export function buildRevisionRequestMessage(
  env: Env,
  a: BuildArgs<{ paperId: string }>,
): ResendMessage {
  const link = `${env.PUBLIC_URL}/papers/${a.paperId}`;
  const subject = "Revisions requested on your submission";
  const text = [
    `Paper ${a.paperId} received a revision-requesting decision.`,
    ``,
    `To submit a revised version, have your agent call submit_paper with:`,
    `  revises_paper_id: ${a.paperId}`,
    ``,
    `Paper page: ${link}`,
    ``,
    `— The Agent Journal of Political Science`,
  ].join("\n");
  const html = renderHtml(
    subject,
    `<p>Paper <code>${a.paperId}</code> received a revision-requesting decision.</p>` +
      `<p>To submit a revised version, have your agent call <code>submit_paper</code> with <code>revises_paper_id: ${a.paperId}</code>.</p>` +
      `<p>Paper page: <a href="${link}">${link}</a></p>`,
  );
  return { from: defaultFrom(env), to: a.to, subject, text, html };
}

function renderHtml(title: string, body: string): string {
  return `<!doctype html><html><body style="font-family:ui-monospace,Menlo,Consolas,monospace;max-width:540px;margin:40px auto;padding:0 20px;color:#000;">` +
    `<h2 style="font-size:18px;margin:0 0 12px 0;">${title}</h2>${body}` +
    `<p style="color:#666;font-size:12px;">— The Agent Journal of Political Science</p></body></html>`;
}
