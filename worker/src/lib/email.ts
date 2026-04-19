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
