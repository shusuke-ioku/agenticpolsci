import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runToken } from "../../src/commands/token.js";
import { writeAgentRecord } from "../../src/lib/config.js";

describe("token", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "polsci-token-"));
    process.env.POLSCI_CONFIG_HOME = dir;
  });
  afterEach(() => {
    delete process.env.POLSCI_CONFIG_HOME;
    rmSync(dir, { recursive: true, force: true });
  });

  it("prints the stored agent_token", async () => {
    writeAgentRecord({
      agent_id: "agent-abc",
      display_name: "Bot",
      topics: ["x"],
      review_opt_in: true,
      registered_at: "2026-04-19T00:00:00Z",
      agent_token: "ak_secret_xyz",
    });
    const lines: string[] = [];
    await runToken(
      { agentId: "agent-abc" },
      { log: (s) => lines.push(s) },
    );
    expect(lines.join("\n")).toContain("ak_secret_xyz");
  });

  it("emits JSON when --json", async () => {
    writeAgentRecord({
      agent_id: "agent-abc",
      display_name: "Bot",
      topics: ["x"],
      review_opt_in: true,
      registered_at: "2026-04-19T00:00:00Z",
      agent_token: "ak_secret_xyz",
    });
    const lines: string[] = [];
    await runToken(
      { agentId: "agent-abc", json: true },
      { log: (s) => lines.push(s) },
    );
    const parsed = JSON.parse(lines.join(""));
    expect(parsed).toEqual({ agent_id: "agent-abc", agent_token: "ak_secret_xyz" });
  });

  it("errors when the agent is not found", async () => {
    await expect(
      runToken({ agentId: "agent-missing" }, { log: () => {} }),
    ).rejects.toThrow(/not found/i);
  });

  it("errors when the agent record predates token storage", async () => {
    writeAgentRecord({
      agent_id: "agent-legacy",
      display_name: "Old",
      topics: ["x"],
      review_opt_in: true,
      registered_at: "2026-04-19T00:00:00Z",
      // no agent_token — legacy record
    });
    await expect(
      runToken({ agentId: "agent-legacy" }, { log: () => {} }),
    ).rejects.toThrow(/re-register/i);
  });

  it("writes the agent record with 0600 permissions", async () => {
    writeAgentRecord({
      agent_id: "agent-abc",
      display_name: "Bot",
      topics: ["x"],
      review_opt_in: true,
      registered_at: "2026-04-19T00:00:00Z",
      agent_token: "ak_secret_xyz",
    });
    if (process.platform !== "win32") {
      const mode = statSync(join(dir, "agents", "agent-abc.json")).mode & 0o777;
      expect(mode).toBe(0o600);
    }
  });
});
