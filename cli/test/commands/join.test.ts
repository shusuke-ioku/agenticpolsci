import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runJoin } from "../../src/commands/join.js";
import { readCredentials, listAgentRecords, writeCredentials } from "../../src/lib/config.js";

describe("join wizard", () => {
  let dir: string;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "polsci-join-"));
    process.env.POLSCI_CONFIG_HOME = dir;
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    delete process.env.POLSCI_CONFIG_HOME;
    vi.unstubAllGlobals();
    rmSync(dir, { recursive: true, force: true });
  });

  it("runs the full happy path end-to-end", async () => {
    // Sequence of fetch responses:
    // 1. register_user → {user_id, verification_token, alpha_notice}
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          user_id: "user_a",
          verification_token: "vtok",
          alpha_notice: "alpha",
        }),
        { status: 200 },
      ),
    );
    // 2. verify_user → {user_token}
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ user_token: "ut_x" }), { status: 200 }),
    );
    // 3. getBalance (start) → 0
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ balance_cents: 0 }), { status: 200 }),
    );
    // 4. topup_balance → checkout
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ checkout_url: "https://stripe.test/x", session_id: "s1" }),
        { status: 200 },
      ),
    );
    // 5. getBalance (poll 1) → 500
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ balance_cents: 500 }), { status: 200 }),
    );
    // 6. register_agent → {agent_id, agent_token}
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ agent_id: "agent-abc", agent_token: "ak_1" }),
        { status: 200 },
      ),
    );

    const lines: string[] = [];
    const answers: Record<string, unknown> = {
      email: "alice@example.com",
      verificationToken: "vtok",
      amount: 5,
      registerAgent: true,
      agentName: "QuantPolBot",
      agentTopics: "comparative-politics,electoral-systems",
      reviewOptIn: true,
    };
    await runJoin(
      { host: "http://localhost:8787" },
      {
        log: (s) => lines.push(s),
        prompt: async (key) => answers[key],
        openUrl: async () => {},
        sleep: async () => {},
        nowMs: (() => {
          let t = 0;
          return () => (t += 100);
        })(),
        timeoutMs: 10_000,
      },
    );

    const creds = readCredentials();
    expect(creds?.user_id).toBe("user_a");
    expect(creds?.user_token).toBe("ut_x");
    expect(listAgentRecords()[0]?.agent_id).toBe("agent-abc");
    expect(lines.join("\n")).toContain("ak_1");
  });

  it("refuses to run if credentials already exist", async () => {
    writeCredentials({
      api_url: "http://localhost:8787",
      user_id: "existing",
      user_token: "ut",
    });
    await expect(
      runJoin(
        { host: "http://localhost:8787" },
        {
          log: () => {},
          prompt: async () => "",
          openUrl: async () => {},
          sleep: async () => {},
          nowMs: () => 0,
          timeoutMs: 10_000,
        },
      ),
    ).rejects.toThrow(/already have an account/i);
  });
});
