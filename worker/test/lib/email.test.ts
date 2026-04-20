import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resendSend } from "../../src/lib/email.js";

describe("resendSend", () => {
  const origFetch = globalThis.fetch;
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { globalThis.fetch = origFetch; });

  it("returns {ok:false, reason:'no_api_key'} when RESEND_API_KEY is missing", async () => {
    const res = await resendSend({ RESEND_API_KEY: "" } as any, {
      from: "a@b", to: "c@d", subject: "s", text: "t", html: "<p>t</p>",
    });
    expect(res).toEqual({ ok: false, reason: "no_api_key" });
  });

  it("calls Resend and returns id on 2xx", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ id: "re_123" }), { status: 200 })
    ) as any;
    const res = await resendSend(
      { RESEND_API_KEY: "k", EMAIL_FROM: "x@y" } as any,
      { from: "x@y", to: "u@v", subject: "s", text: "t", html: "<p>t</p>" },
    );
    expect(res).toEqual({ ok: true, resend_id: "re_123" });
  });

  it("returns {ok:false, reason:'resend_error: <status>'} on non-2xx", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response("rate limited", { status: 429 })
    ) as any;
    const res = await resendSend(
      { RESEND_API_KEY: "k" } as any,
      { from: "a@b", to: "c@d", subject: "s", text: "t", html: "<p>t</p>" },
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/^resend_error: 429/);
  });
});

import {
  buildAssignmentMessage,
  buildDecisionMessage,
  buildDeskRejectMessage,
  buildRevisionRequestMessage,
} from "../../src/lib/email.js";

describe("template builders", () => {
  const env = { EMAIL_FROM: "Agentic Journal <j@agent.test>", PUBLIC_URL: "https://pub.test" } as any;

  it("assignment includes agent_id, paper_id, due date, MCP tool name", () => {
    const m = buildAssignmentMessage(env, {
      to: "u@x",
      agentId: "agent-abc",
      paperId: "paper-2026-0007",
      reviewId: "review-001",
      dueAt: "2026-05-01T00:00:00Z",
    });
    expect(m.subject).toMatch(/assigned a review/i);
    for (const s of [m.text, m.html]) {
      expect(s).toContain("agent-abc");
      expect(s).toContain("paper-2026-0007");
      expect(s).toContain("2026-05-01");
      expect(s).toContain("get_my_review_assignments");
      expect(s).toContain("https://pub.test/papers/paper-2026-0007");
    }
  });

  it("decision humanizes each outcome", () => {
    const cases: Array<[string, RegExp]> = [
      ["accept", /Accepted/],
      ["accept_with_revisions", /Accepted with revisions/],
      ["major_revisions", /Major revisions required/],
      ["reject", /Rejected/],
    ];
    for (const [outcome, rx] of cases) {
      const m = buildDecisionMessage(env, { to: "u@x", paperId: "paper-2026-0003", outcome: outcome as any });
      expect(m.subject).toMatch(rx);
      expect(m.text).toMatch(rx);
      expect(m.html).toMatch(rx);
      expect(m.text).toContain("paper-2026-0003");
      expect(m.text).toContain("https://pub.test/papers/paper-2026-0003");
    }
  });

  it("desk_reject includes paper_id and link", () => {
    const m = buildDeskRejectMessage(env, { to: "u@x", paperId: "paper-2026-0004" });
    expect(m.subject).toMatch(/desk-rejected/i);
    expect(m.text).toContain("paper-2026-0004");
    expect(m.text).toContain("https://pub.test/papers/paper-2026-0004");
  });

  it("revision_request tells the agent to call update_paper with the same paper_id (not submit_paper)", () => {
    const m = buildRevisionRequestMessage(env, { to: "u@x", paperId: "paper-2026-0005" });
    expect(m.subject).toMatch(/revisions requested/i);
    expect(m.text).toContain("update_paper");
    expect(m.text).toContain("paper_id: paper-2026-0005");
    // Explicit warn against the submit_paper + revises_paper_id anti-pattern.
    expect(m.text).toMatch(/Do NOT call submit_paper/);
  });
});
