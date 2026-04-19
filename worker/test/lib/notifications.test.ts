import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { ensureMigrated, seedUser, seedAgent } from "../helpers/db.js";
import {
  ledgerHas, ledgerInsert, resolveRecipient,
} from "../../src/lib/notifications.js";

describe("notifications lib", () => {
  beforeEach(async () => {
    await ensureMigrated();
  });

  it("ledgerHas returns false when the key is absent and true after insert", async () => {
    expect(await ledgerHas(env, "reviewer_assignment", "review-001", "user-a")).toBe(false);
    await ledgerInsert(env, {
      id: "notif-1",
      kind: "reviewer_assignment",
      target_id: "review-001",
      recipient_user_id: "user-a",
      resend_id: "re_x",
    });
    expect(await ledgerHas(env, "reviewer_assignment", "review-001", "user-a")).toBe(true);
  });

  it("ledgerInsert is idempotent on the unique key (no throw on conflict)", async () => {
    await ledgerInsert(env, {
      id: "notif-2", kind: "decision", target_id: "paper-2026-0001", recipient_user_id: "user-a",
    });
    await expect(
      ledgerInsert(env, {
        id: "notif-3", kind: "decision", target_id: "paper-2026-0001", recipient_user_id: "user-a",
      }),
    ).resolves.not.toThrow();
    const { results } = await env.DB.prepare(
      "SELECT id FROM email_notifications_sent WHERE kind=? AND target_id=? AND recipient_user_id=?",
    ).bind("decision", "paper-2026-0001", "user-a").all<{ id: string }>();
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("notif-2");
  });

  it("resolveRecipient returns {user_id, email} for a known agent", async () => {
    const { user_id } = await seedUser({ email: "owner@test.example" });
    const { agent_id } = await seedAgent({ owner_user_id: user_id });
    const r = await resolveRecipient(env, agent_id);
    expect(r).toEqual({ user_id, email: "owner@test.example" });
  });

  it("resolveRecipient returns null when agent_id is unknown", async () => {
    const r = await resolveRecipient(env, "agent-nope");
    expect(r).toBeNull();
  });

  it("resolveRecipient returns {user_id, email: null} when user has no email (defensive)", async () => {
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      "INSERT INTO users (user_id,email,created_at) VALUES (?,?,?)",
    ).bind("user-noemail", `noemail-${now}@test.example`, now).run();
    await env.DB.prepare("UPDATE users SET email = NULL WHERE user_id = 'user-noemail'").run();
    await env.DB.prepare(
      "INSERT INTO agent_tokens (token_id,agent_id,owner_user_id,token_hash,created_at) VALUES (?,?,?,?,?)",
    ).bind("tok-noemail", "agent-noemail", "user-noemail", "deadbeef", now).run();
    const r = await resolveRecipient(env, "agent-noemail");
    expect(r).toEqual({ user_id: "user-noemail", email: null });
  });
});
