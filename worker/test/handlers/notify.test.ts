import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { env } from "cloudflare:test";
import { ensureMigrated, seedUser, seedAgent } from "../helpers/db.js";
import { notify } from "../../src/handlers/notify.js";

const origFetch = globalThis.fetch;

function mockResendOk(id = "re_ok") {
  globalThis.fetch = vi.fn(async () =>
    new Response(JSON.stringify({ id }), { status: 200 }),
  ) as any;
}

describe("notify handler", () => {
  beforeEach(async () => {
    await ensureMigrated();
  });
  afterEach(() => { globalThis.fetch = origFetch; });

  it("happy path: sends one of each kind, writes ledger rows", async () => {
    mockResendOk();
    const { user_id: u1 } = await seedUser({ email: "rev@test.example" });
    const { agent_id: rev } = await seedAgent({ owner_user_id: u1 });
    const { user_id: u2 } = await seedUser({ email: "auth@test.example" });
    const { agent_id: auth } = await seedAgent({ owner_user_id: u2 });

    const res = await notify(
      { ...env, RESEND_API_KEY: "k", EMAIL_FROM: "x@y", PUBLIC_URL: "https://p" } as any,
      {
        items: [
          { kind: "reviewer_assignment", paper_id: "paper-2026-0001", review_id: "review-001", reviewer_agent_id: rev, due_at: "2026-05-01T00:00:00Z" },
          { kind: "decision", paper_id: "paper-2026-0002", outcome: "accept", author_agent_ids: [auth] },
          { kind: "desk_reject", paper_id: "paper-2026-0003", author_agent_ids: [auth] },
          { kind: "revision_request", paper_id: "paper-2026-0004", author_agent_ids: [auth] },
        ],
      },
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.sent).toBe(4);
    expect(res.value.skipped_dedupe).toBe(0);
    expect(res.value.failed).toEqual([]);
    expect((globalThis.fetch as any).mock.calls.length).toBe(4);

    const { results } = await env.DB.prepare(
      "SELECT kind, target_id, recipient_user_id FROM email_notifications_sent ORDER BY kind, target_id",
    ).all<{ kind: string; target_id: string; recipient_user_id: string }>();
    expect(results).toHaveLength(4);
  });

  it("dedupes: same payload twice → second run sends 0", async () => {
    mockResendOk();
    const { user_id } = await seedUser({ email: "u@test.example" });
    const { agent_id } = await seedAgent({ owner_user_id: user_id });
    const payload = {
      items: [
        { kind: "reviewer_assignment" as const, paper_id: "paper-2026-0001", review_id: "review-001", reviewer_agent_id: agent_id, due_at: "2026-05-01T00:00:00Z" },
      ],
    };
    const cfg = { ...env, RESEND_API_KEY: "k", PUBLIC_URL: "https://p" } as any;

    const first = await notify(cfg, payload);
    const second = await notify(cfg, payload);
    expect(first.ok && first.value.sent).toBe(1);
    expect(second.ok && second.value.sent).toBe(0);
    expect(second.ok && second.value.skipped_dedupe).toBe(1);
    expect((globalThis.fetch as any).mock.calls.length).toBe(1);
  });

  it("partial failure: Resend 500 → item goes to failed, no ledger row, other items succeed", async () => {
    let calls = 0;
    globalThis.fetch = vi.fn(async () => {
      calls++;
      return calls === 1
        ? new Response("boom", { status: 500 })
        : new Response(JSON.stringify({ id: "re_ok" }), { status: 200 });
    }) as any;
    const { user_id: u } = await seedUser({ email: "u@test.example" });
    const { agent_id: a } = await seedAgent({ owner_user_id: u });
    const res = await notify(
      { ...env, RESEND_API_KEY: "k", PUBLIC_URL: "https://p" } as any,
      {
        items: [
          { kind: "decision", paper_id: "paper-2026-0001", outcome: "accept", author_agent_ids: [a] },
          { kind: "decision", paper_id: "paper-2026-0002", outcome: "reject", author_agent_ids: [a] },
        ],
      },
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.sent).toBe(1);
    expect(res.value.failed).toHaveLength(1);
    expect(res.value.failed[0].reason).toMatch(/^resend_error: 500/);
    const { results } = await env.DB.prepare(
      "SELECT target_id FROM email_notifications_sent",
    ).all<{ target_id: string }>();
    expect(results.map((r) => r.target_id)).toEqual(["paper-2026-0002"]);
  });

  it("unknown agent → failed with reason 'unknown_agent'", async () => {
    mockResendOk();
    const res = await notify(
      { ...env, RESEND_API_KEY: "k", PUBLIC_URL: "https://p" } as any,
      {
        items: [
          { kind: "decision", paper_id: "paper-2026-0001", outcome: "accept", author_agent_ids: ["agent-ghost"] },
        ],
      },
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.failed[0].reason).toBe("unknown_agent");
    expect((globalThis.fetch as any).mock?.calls?.length ?? 0).toBe(0);
  });

  it("fan-out: decision with two authors sends to each and dedupes each independently", async () => {
    mockResendOk();
    const { user_id: u1 } = await seedUser({ email: "a1@test.example" });
    const { agent_id: a1 } = await seedAgent({ owner_user_id: u1 });
    const { user_id: u2 } = await seedUser({ email: "a2@test.example" });
    const { agent_id: a2 } = await seedAgent({ owner_user_id: u2 });
    const res = await notify(
      { ...env, RESEND_API_KEY: "k", PUBLIC_URL: "https://p" } as any,
      {
        items: [
          { kind: "decision", paper_id: "paper-2026-0001", outcome: "accept", author_agent_ids: [a1, a2] },
        ],
      },
    );
    expect(res.ok && res.value.sent).toBe(2);
    const { results } = await env.DB.prepare(
      "SELECT DISTINCT recipient_user_id FROM email_notifications_sent",
    ).all<{ recipient_user_id: string }>();
    expect(new Set(results.map((r) => r.recipient_user_id))).toEqual(new Set([u1, u2]));
  });

  it("rejects invalid body with invalid_input", async () => {
    const res = await notify({ ...env } as any, { items: [] } as any);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("invalid_input");
  });
});
