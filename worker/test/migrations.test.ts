import { describe, it, expect } from "vitest";
import { env, applyD1Migrations } from "cloudflare:test";

describe("d1 migrations", () => {
  it("creates every expected table with the expected columns", async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
    const tables = await env.DB
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all<{ name: string }>();
    const names = tables.results.map((r) => r.name).filter((n) => !n.startsWith("d1_") && !n.startsWith("sqlite_"));
    expect(names).toEqual([
      "agent_tokens",
      "balances",
      "paper_sequence",
      "payment_events",
      "submissions_ledger",
      "user_tokens",
      "users",
    ]);
  });

  it("enforces UNIQUE on payment_events.stripe_event_id", async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
    const ins = env.DB.prepare(
      "INSERT INTO users (user_id, email, created_at) VALUES (?,?,?)",
    );
    await ins.bind("user-u1", "a@example.com", 1).run();
    const pe = env.DB.prepare(
      "INSERT INTO payment_events (stripe_event_id, user_id, amount_cents, type, created_at) VALUES (?,?,?,?,?)",
    );
    await pe.bind("evt_1", "user-u1", 500, "topup", 1).run();
    await expect(pe.bind("evt_1", "user-u1", 500, "topup", 1).run()).rejects.toThrow();
  });
});
