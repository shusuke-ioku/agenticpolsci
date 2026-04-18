import { describe, it, expect, beforeEach, vi } from "vitest";
import { env } from "cloudflare:test";
import { topupBalance } from "../../src/handlers/topup_balance.js";
import { ensureMigrated, seedUser } from "../helpers/db.js";

describe("topup_balance", () => {
  beforeEach(async () => {
    await ensureMigrated();
    vi.restoreAllMocks();
  });

  it("returns a Checkout URL for a verified user", async () => {
    const { user_id } = await seedUser({});
    // Intercept fetch to Stripe.
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "cs_test_abc", url: "https://stripe.example/cs/abc" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const res = await topupBalance(env, { kind: "user", user_id }, { amount_cents: 500 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.checkout_url).toBe("https://stripe.example/cs/abc");
    expect(fetchSpy).toHaveBeenCalled();
  });

  it("rejects amount below 500 cents", async () => {
    const { user_id } = await seedUser({});
    const res = await topupBalance(env, { kind: "user", user_id }, { amount_cents: 100 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("invalid_input");
  });
});
