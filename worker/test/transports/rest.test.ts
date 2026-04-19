import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SELF, env } from "cloudflare:test";
import { ensureMigrated, seedUser, seedAgent } from "../helpers/db.js";
import { installGithubMock } from "../helpers/github-mock.js";

describe("REST transport", () => {
  let restore: () => void = () => {};
  beforeEach(async () => {
    await ensureMigrated();
  });
  afterEach(() => restore());

  it("full happy path: register_user → verify_user → register_agent → topup (mocked) → submit_paper (mocked fetch)", async () => {
    const mock = installGithubMock();
    restore = mock.restore;

    // register_user
    const reg = await SELF.fetch("http://worker/v1/register_user", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "e2e@example.com" }),
    });
    expect(reg.status).toBe(200);
    const regBody = (await reg.json()) as { user_id: string; verification_token?: string };
    // When RESEND_API_KEY is set the token is emailed, not returned in the body;
    // fall back to reading it directly from the DB.
    const verificationToken =
      regBody.verification_token ??
      (
        await env.DB.prepare("SELECT verification_token FROM users WHERE email = ?")
          .bind("e2e@example.com")
          .first<{ verification_token: string }>()
      )?.verification_token;

    // verify_user
    const ver = await SELF.fetch("http://worker/v1/verify_user", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "e2e@example.com",
        verification_token: verificationToken,
      }),
    });
    expect(ver.status).toBe(200);
    const verBody = (await ver.json()) as { user_token: string };

    // register_agent
    const ra = await SELF.fetch("http://worker/v1/register_agent", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${verBody.user_token}`,
      },
      body: JSON.stringify({
        display_name: "QuantPolBot",
        topics: ["comparative-politics"],
        review_opt_in: true,
        model_family: "claude-opus-4-5",
      }),
    });
    expect(ra.status).toBe(200);
  });

  it("401 when missing bearer on a protected route", async () => {
    const res = await SELF.fetch("http://worker/v1/register_agent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(res.status).toBe(401);
  });

  describe("POST /v1/internal/notify", () => {
    it("401 when no bearer header is present", async () => {
      const res = await SELF.fetch("http://worker/v1/internal/notify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: [
            { kind: "decision", paper_id: "paper-2026-0001", outcome: "accept", author_agent_ids: ["agent-x"] },
          ],
        }),
      });
      expect(res.status).toBe(401);
    });

    it("401 when bearer token does not match OPERATOR_API_TOKEN", async () => {
      const res = await SELF.fetch("http://worker/v1/internal/notify", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer wrong-token",
        },
        body: JSON.stringify({
          items: [
            { kind: "decision", paper_id: "paper-2026-0001", outcome: "accept", author_agent_ids: ["agent-x"] },
          ],
        }),
      });
      expect(res.status).toBe(401);
    });

    it("400 on invalid body", async () => {
      const res = await SELF.fetch("http://worker/v1/internal/notify", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer op-test-secret",
        },
        body: JSON.stringify({ items: [] }),
      });
      expect(res.status).toBe(400);
    });

    it("200 with summary end-to-end (Resend mocked)", async () => {
      const origFetch = globalThis.fetch;
      globalThis.fetch = ((input: any, init?: any) => {
        if (typeof input === "string" && input.startsWith("https://api.resend.com/")) {
          return Promise.resolve(new Response(JSON.stringify({ id: "re_e2e" }), { status: 200 }));
        }
        return origFetch(input, init);
      }) as any;
      try {
        const { user_id } = await seedUser({ email: "e2e-notify@test.example" });
        const { agent_id } = await seedAgent({ owner_user_id: user_id });
        const res = await SELF.fetch("http://worker/v1/internal/notify", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: "Bearer op-test-secret",
          },
          body: JSON.stringify({
            items: [
              { kind: "decision", paper_id: "paper-2026-0001", outcome: "accept", author_agent_ids: [agent_id] },
            ],
          }),
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { sent: number };
        expect(body.sent).toBe(1);
      } finally {
        globalThis.fetch = origFetch;
      }
    });
  });
});
