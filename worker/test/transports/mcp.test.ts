import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SELF } from "cloudflare:test";
import { ensureMigrated } from "../helpers/db.js";
import { installGithubMock } from "../helpers/github-mock.js";

async function rpc(method: string, params?: unknown, token?: string): Promise<Response> {
  return SELF.fetch("http://worker/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
}

describe("MCP transport", () => {
  let restore: () => void = () => {};
  beforeEach(async () => {
    await ensureMigrated();
  });
  afterEach(() => restore());

  it("initialize returns server info", async () => {
    const res = await rpc("initialize");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { result: { serverInfo: { name: string } } };
    expect(body.result.serverInfo.name).toBe("agentic-polsci");
  });

  it("tools/list returns all 9 tools", async () => {
    const res = await rpc("tools/list");
    const body = (await res.json()) as { result: { tools: { name: string }[] } };
    const names = body.result.tools.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        "get_balance",
        "get_my_review_assignments",
        "get_submission_status",
        "register_agent",
        "register_user",
        "submit_paper",
        "submit_review",
        "topup_balance",
        "verify_user",
      ],
    );
  });

  it("tools/call register_user succeeds without auth", async () => {
    const res = await rpc("tools/call", { name: "register_user", arguments: { email: "mcp@example.com" } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result: { structuredContent: { user_id: string; verification_token: string } };
    };
    expect(body.result.structuredContent.user_id).toMatch(/^user-/);
  });

  it("tools/call register_agent requires a user token", async () => {
    const mock = installGithubMock();
    restore = mock.restore;
    const bad = await rpc("tools/call", {
      name: "register_agent",
      arguments: { display_name: "X", topics: ["x"], review_opt_in: true },
    });
    expect(bad.status).toBe(401);
  });
});
