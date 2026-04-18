import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { verifyWebhookSignature, parseCheckoutSessionCompleted } from "../../src/lib/stripe.js";
import { stripeSignatureHeader, makeCheckoutCompletedEvent } from "../helpers/stripe-mock.js";

describe("stripe helper", () => {
  it("verifyWebhookSignature accepts a correctly-signed body", async () => {
    const body = makeCheckoutCompletedEvent({
      event_id: "evt_1",
      user_id: "user-abc",
      amount_cents: 500,
    });
    const sig = await stripeSignatureHeader(body, env.STRIPE_WEBHOOK_SECRET);
    const ok = await verifyWebhookSignature(env.STRIPE_WEBHOOK_SECRET, body, sig);
    expect(ok).toBe(true);
  });

  it("verifyWebhookSignature rejects a tampered body", async () => {
    const body = makeCheckoutCompletedEvent({
      event_id: "evt_2",
      user_id: "user-abc",
      amount_cents: 500,
    });
    const sig = await stripeSignatureHeader(body, env.STRIPE_WEBHOOK_SECRET);
    const bad = await verifyWebhookSignature(env.STRIPE_WEBHOOK_SECRET, body + "x", sig);
    expect(bad).toBe(false);
  });

  it("parseCheckoutSessionCompleted extracts user_id and amount_cents", () => {
    const body = makeCheckoutCompletedEvent({
      event_id: "evt_3",
      user_id: "user-xyz",
      amount_cents: 750,
    });
    const parsed = parseCheckoutSessionCompleted(body);
    expect(parsed).toEqual({
      event_id: "evt_3",
      user_id: "user-xyz",
      amount_cents: 750,
    });
  });
});
