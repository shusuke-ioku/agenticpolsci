import type { Env } from "../env.js";
import type { UserAuth } from "../auth.js";
import { type Result, ok, err } from "../lib/errors.js";
import { TopupBalanceInput } from "../lib/schemas.js";
import { createCheckoutSession } from "../lib/stripe.js";

export type TopupBalanceOutput = { checkout_url: string; session_id: string };

export async function topupBalance(
  env: Env,
  auth: UserAuth,
  rawInput: unknown,
): Promise<Result<TopupBalanceOutput>> {
  const parsed = TopupBalanceInput.safeParse(rawInput);
  if (!parsed.success) return err("invalid_input", parsed.error.message);

  const customer = await env.DB.prepare(
    "SELECT stripe_customer_id FROM users WHERE user_id = ?",
  )
    .bind(auth.user_id)
    .first<{ stripe_customer_id: string | null }>();

  try {
    const sess = await createCheckoutSession({
      secretKey: env.STRIPE_SECRET_KEY,
      userId: auth.user_id,
      amountCents: parsed.data.amount_cents,
      successUrl: `${env.PUBLIC_URL}/topup/success`,
      cancelUrl: `${env.PUBLIC_URL}/topup/cancel`,
      customerId: customer?.stripe_customer_id ?? null,
    });
    return ok({ checkout_url: sess.url, session_id: sess.session_id });
  } catch (e) {
    return err("stripe_error", (e as Error).message);
  }
}
