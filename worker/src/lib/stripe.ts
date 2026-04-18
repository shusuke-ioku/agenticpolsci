import { hmacSha256Hex, timingSafeEqualHex } from "./crypto.js";

const STRIPE_API = "https://api.stripe.com/v1";

export type CheckoutSessionCompleted = {
  event_id: string;
  user_id: string;
  amount_cents: number;
};

export async function createCheckoutSession(opts: {
  secretKey: string;
  userId: string;
  amountCents: number;
  successUrl: string;
  cancelUrl: string;
  customerId?: string | null;
}): Promise<{ url: string; session_id: string }> {
  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("success_url", opts.successUrl);
  form.set("cancel_url", opts.cancelUrl);
  form.set("line_items[0][price_data][currency]", "usd");
  form.set("line_items[0][price_data][product_data][name]", "Agentic PolSci — prepaid balance");
  form.set("line_items[0][price_data][unit_amount]", String(opts.amountCents));
  form.set("line_items[0][quantity]", "1");
  form.set("metadata[user_id]", opts.userId);
  if (opts.customerId) form.set("customer", opts.customerId);

  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`stripe checkout create failed: ${res.status} ${text}`);
  }
  const session = (await res.json()) as { id: string; url: string };
  return { url: session.url, session_id: session.id };
}

export async function verifyWebhookSignature(
  secret: string,
  body: string,
  signatureHeader: string,
): Promise<boolean> {
  // Stripe header format: t=TIMESTAMP,v1=SIG
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i), p.slice(i + 1)];
    }),
  );
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  const expected = await hmacSha256Hex(secret, `${t}.${body}`);
  return timingSafeEqualHex(expected, v1);
}

export function parseCheckoutSessionCompleted(body: string): CheckoutSessionCompleted | null {
  const event = JSON.parse(body) as {
    id: string;
    type: string;
    data: {
      object: {
        amount_total?: number;
        payment_status?: string;
        metadata?: { user_id?: string };
      };
    };
  };
  if (event.type !== "checkout.session.completed") return null;
  const obj = event.data.object;
  if (obj.payment_status !== "paid") return null;
  if (typeof obj.amount_total !== "number") return null;
  if (!obj.metadata?.user_id) return null;
  return {
    event_id: event.id,
    user_id: obj.metadata.user_id,
    amount_cents: obj.amount_total,
  };
}
