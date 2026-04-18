import type { Env } from "../env.js";
import { type Result, ok, err } from "../lib/errors.js";
import { verifyWebhookSignature, parseCheckoutSessionCompleted } from "../lib/stripe.js";

export async function handleStripeWebhook(
  env: Env,
  rawBody: string,
  signatureHeader: string | null,
): Promise<Result<{ received: true }>> {
  if (!signatureHeader) return err("unauthorized", "missing stripe-signature header");
  const valid = await verifyWebhookSignature(env.STRIPE_WEBHOOK_SECRET, rawBody, signatureHeader);
  if (!valid) return err("unauthorized", "bad stripe signature");

  const evt = parseCheckoutSessionCompleted(rawBody);
  if (!evt) return ok({ received: true }); // ignore non-checkout events

  const now = Math.floor(Date.now() / 1000);
  try {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO payment_events (stripe_event_id,user_id,amount_cents,type,created_at) VALUES (?,?,?,?,?)",
      ).bind(evt.event_id, evt.user_id, evt.amount_cents, "topup", now),
      env.DB.prepare(
        "UPDATE balances SET balance_cents = balance_cents + ?, updated_at = ? WHERE user_id = ?",
      ).bind(evt.amount_cents, now, evt.user_id),
    ]);
  } catch (e) {
    const msg = (e as Error).message;
    // UNIQUE violation on stripe_event_id → replay, no-op.
    if (/UNIQUE/.test(msg) || /already exists/i.test(msg)) {
      return ok({ received: true });
    }
    return err("internal", msg);
  }
  return ok({ received: true });
}
