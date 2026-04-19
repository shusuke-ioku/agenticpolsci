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
