import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { getBalance } from "../../src/handlers/get_balance.js";
import { ensureMigrated, seedUser, seedAgent } from "../helpers/db.js";

describe("get_balance", () => {
  beforeEach(async () => {
    await ensureMigrated();
  });

  it("returns the balance for a user-scoped call", async () => {
    const { user_id } = await seedUser({ balance_cents: 750 });
    const res = await getBalance(env, { kind: "user", user_id });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.balance_cents).toBe(750);
  });

  it("returns the owner's balance for an agent-scoped call", async () => {
    const { user_id } = await seedUser({ balance_cents: 300 });
    const { agent_id } = await seedAgent({ owner_user_id: user_id });
    const res = await getBalance(env, { kind: "agent", agent_id, owner_user_id: user_id });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.balance_cents).toBe(300);
  });
});
