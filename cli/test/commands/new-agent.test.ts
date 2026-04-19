import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runNewAgent } from "../../src/commands/new-agent.js";
import { writeCredentials, listAgentRecords } from "../../src/lib/config.js";

describe("new-agent", () => {
  let dir: string;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "polsci-new-"));
    process.env.POLSCI_CONFIG_HOME = dir;
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    writeCredentials({
      api_url: "http://localhost:8787",
      user_id: "u",
      user_token: "ut_1",
    });
  });
  afterEach(() => {
    delete process.env.POLSCI_CONFIG_HOME;
    vi.unstubAllGlobals();
    rmSync(dir, { recursive: true, force: true });
  });

  it("registers agent, saves metadata, prints MCP snippet", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ agent_id: "agent-xyz", agent_token: "ak_secret_123" }),
        { status: 200 },
      ),
    );
    const lines: string[] = [];
    const r = await runNewAgent(
      {
        name: "QuantPolBot",
        topics: "comparative-politics,electoral-systems",
        reviewOptIn: true,
      },
      { log: (s) => lines.push(s) },
    );
    expect(r.agent_id).toBe("agent-xyz");
    const saved = listAgentRecords();
    expect(saved).toHaveLength(1);
    expect(saved[0]!.agent_id).toBe("agent-xyz");
    expect(saved[0]!.topics).toEqual(["comparative-politics", "electoral-systems"]);

    // model_family should no longer be sent — model disclosure moved to per-submission.
    const requestBody = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(requestBody.model_family).toBeUndefined();

    const out = lines.join("\n");
    expect(out).toContain("ak_secret_123");
    expect(out).toContain("mcpServers");
    expect(out).toContain("shown ONCE");
  });

  it("JSON mode emits structured payload", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ agent_id: "agent-xyz", agent_token: "ak_1" }),
        { status: 200 },
      ),
    );
    const lines: string[] = [];
    await runNewAgent(
      { name: "bot", topics: "x", reviewOptIn: false, json: true },
      { log: (s) => lines.push(s) },
    );
    // Should emit exactly one JSON blob.
    const joined = lines.join("");
    const parsed = JSON.parse(joined);
    expect(parsed.agent_id).toBe("agent-xyz");
    expect(parsed.agent_token).toBe("ak_1");
    expect(parsed.mcp_config.mcpServers["agentic-polsci"]).toBeDefined();
  });

  it("errors if not authenticated", async () => {
    rmSync(dir, { recursive: true, force: true });
    const dir2 = mkdtempSync(join(tmpdir(), "polsci-new2-"));
    process.env.POLSCI_CONFIG_HOME = dir2;
    await expect(
      runNewAgent(
        { name: "bot", topics: "x", reviewOptIn: true },
        { log: () => {} },
      ),
    ).rejects.toThrow(/not authenticated/i);
    rmSync(dir2, { recursive: true, force: true });
  });
});
