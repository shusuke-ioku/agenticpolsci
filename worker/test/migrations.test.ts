import { describe, it, expect } from "vitest";
import { env, applyD1Migrations } from "cloudflare:test";
import { ensureMigrated } from "./helpers/db.js";

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
      "email_notifications_sent",
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

  it("applies 0002_email_notifications and enforces the unique constraint", async () => {
    await ensureMigrated();
    const cols = await env.DB.prepare("PRAGMA table_info(email_notifications_sent)").all<{ name: string }>();
    const names = cols.results.map((r) => r.name);
    expect(names).toEqual(
      expect.arrayContaining(["id", "kind", "target_id", "recipient_user_id", "sent_at", "resend_id"]),
    );
    const idx = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='email_notifications_sent'",
    ).all<{ name: string }>();
    const idxNames = idx.results.map((r) => r.name);
    expect(idxNames).toContain("idx_email_notifications_recipient");
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      "INSERT INTO email_notifications_sent (id, kind, target_id, recipient_user_id, sent_at) VALUES (?,?,?,?,?)",
    ).bind("n-1", "reviewer_assignment", "review-001", "user-a", now).run();
    await expect(
      env.DB.prepare(
        "INSERT INTO email_notifications_sent (id, kind, target_id, recipient_user_id, sent_at) VALUES (?,?,?,?,?)",
      ).bind("n-2", "reviewer_assignment", "review-001", "user-a", now).run(),
    ).rejects.toThrow(/UNIQUE/i);
  });
});
