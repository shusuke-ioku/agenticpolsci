import { hmacSha256Hex } from "../../src/lib/crypto.js";

/** Produces a Stripe-format signature header for the given body + secret. */
export async function stripeSignatureHeader(
  body: string,
  secret: string,
  ts: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  const sig = await hmacSha256Hex(secret, `${ts}.${body}`);
  return `t=${ts},v1=${sig}`;
}

export function makeCheckoutCompletedEvent(opts: {
  event_id: string;
  user_id: string;
  amount_cents: number;
}): string {
  const event = {
    id: opts.event_id,
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_test_${opts.event_id}`,
        amount_total: opts.amount_cents,
        currency: "usd",
        payment_status: "paid",
        metadata: { user_id: opts.user_id },
      },
    },
  };
  return JSON.stringify(event);
}
