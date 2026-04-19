import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  registerUser,
  verifyUser,
  registerAgent,
  topupBalance,
  getBalance,
} from "../../src/lib/api.js";
import { ApiErrorResponse } from "../../src/types.js";

const API = "http://localhost:8787";

describe("api", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registerUser POSTs email and returns response", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ user_id: "user_1", verification_token: "t", alpha_notice: "ok" }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const r = await registerUser(API, { email: "a@b.com" });
    expect(r.user_id).toBe("user_1");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8787/v1/register_user",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "content-type": "application/json" }),
        body: JSON.stringify({ email: "a@b.com" }),
      }),
    );
  });

  it("verifyUser POSTs email and token", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ user_token: "ut_1" }), { status: 200 }),
    );
    const r = await verifyUser(API, { email: "a@b.com", verification_token: "t" });
    expect(r.user_token).toBe("ut_1");
  });

  it("registerAgent includes bearer header and preserves content-type + body", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ agent_id: "agent-x", agent_token: "ak_1" }), { status: 200 }),
    );
    await registerAgent(API, "ut_1", {
      display_name: "bot",
      topics: ["x"],
      review_opt_in: true,
    });
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("http://localhost:8787/v1/register_agent");
    expect((call[1] as RequestInit).method).toBe("POST");
    expect((call[1] as RequestInit).headers).toEqual(
      expect.objectContaining({
        authorization: "Bearer ut_1",
        "content-type": "application/json",
      }),
    );
    expect((call[1] as RequestInit).body).toBe(
      JSON.stringify({ display_name: "bot", topics: ["x"], review_opt_in: true }),
    );
  });

  it("topupBalance POSTs amount_cents", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ checkout_url: "https://x", session_id: "s" }), {
        status: 200,
      }),
    );
    const r = await topupBalance(API, "ut_1", { amount_cents: 500 });
    expect(r.checkout_url).toBe("https://x");
  });

  it("getBalance issues GET with bearer header", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ balance_cents: 500 }), { status: 200 }),
    );
    const r = await getBalance(API, "ut_1");
    expect(r.balance_cents).toBe(500);
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("http://localhost:8787/v1/balance");
    expect((call[1] as RequestInit).method).toBe("GET");
    expect((call[1] as RequestInit).headers).toEqual(
      expect.objectContaining({ authorization: "Bearer ut_1" }),
    );
  });

  it("throws ApiErrorResponse on non-2xx with structured error", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: "conflict", message: "dup" } }), {
        status: 409,
      }),
    );
    await expect(registerUser(API, { email: "a@b.com" })).rejects.toMatchObject({
      name: "ApiErrorResponse",
      status: 409,
      error: { code: "conflict", message: "dup" },
    });
  });

  it("throws ApiErrorResponse on non-2xx with unstructured body", async () => {
    fetchMock.mockResolvedValueOnce(new Response("garbage", { status: 500 }));
    await expect(registerUser(API, { email: "a@b.com" })).rejects.toBeInstanceOf(ApiErrorResponse);
  });

  it("throws ApiErrorResponse when error body is missing required fields", async () => {
    // Body parses as JSON but error.message is absent — should fall back to http_error.
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: "bad_request" } }), { status: 400 }),
    );
    await expect(registerUser(API, { email: "a@b.com" })).rejects.toMatchObject({
      name: "ApiErrorResponse",
      status: 400,
      error: { code: "http_error" },
    });
  });
});
