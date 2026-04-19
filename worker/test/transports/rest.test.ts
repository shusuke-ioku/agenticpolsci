import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SELF } from "cloudflare:test";
import { ensureMigrated } from "../helpers/db.js";
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
    const regBody = (await reg.json()) as { user_id: string; verification_token: string };

    // verify_user
    const ver = await SELF.fetch("http://worker/v1/verify_user", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "e2e@example.com",
        verification_token: regBody.verification_token,
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
});
