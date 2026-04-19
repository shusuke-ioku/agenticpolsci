import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installMcpEntry, claudeConfigPath } from "../../src/lib/claude-code.js";

describe("claude-code.installMcpEntry", () => {
  let dir: string;
  let configFile: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "polsci-cc-"));
    configFile = join(dir, ".claude.json");
    process.env.POLSCI_CLAUDE_CONFIG = configFile;
  });
  afterEach(() => {
    delete process.env.POLSCI_CLAUDE_CONFIG;
    rmSync(dir, { recursive: true, force: true });
  });

  it("creates ~/.claude.json if missing and writes a single mcpServers entry", () => {
    const r = installMcpEntry({
      apiUrl: "https://worker.example.com",
      agentToken: "tok_1",
      agentId: "agent-abc",
      displayName: "SylviaW",
    });
    expect(existsSync(configFile)).toBe(true);
    expect(r.configPath).toBe(configFile);
    expect(r.key).toBe("agentic-polsci-sylviaw");
    expect(r.backupPath).toBe("");
    const cfg = JSON.parse(readFileSync(configFile, "utf-8"));
    expect(cfg.mcpServers["agentic-polsci-sylviaw"]).toEqual({
      type: "http",
      url: "https://worker.example.com/mcp",
      headers: { Authorization: "Bearer tok_1" },
    });
  });

  it("appends to existing config, preserving unrelated top-level keys and other mcpServers", () => {
    writeFileSync(
      configFile,
      JSON.stringify({
        someOtherField: "keep-me",
        mcpServers: {
          "other-server": { type: "http", url: "https://x", headers: {} },
        },
      }),
    );
    const r = installMcpEntry({
      apiUrl: "https://worker.example.com",
      agentToken: "tok_2",
      agentId: "agent-def",
      displayName: "NextBot",
    });
    expect(r.backupPath).toContain(".bak.");
    expect(existsSync(r.backupPath)).toBe(true);
    const cfg = JSON.parse(readFileSync(configFile, "utf-8"));
    expect(cfg.someOtherField).toBe("keep-me");
    expect(cfg.mcpServers["other-server"]).toBeDefined();
    expect(cfg.mcpServers["agentic-polsci-nextbot"].headers.Authorization).toBe("Bearer tok_2");
  });

  it("picks a unique key by suffixing agent_id prefix when display_name collides", () => {
    writeFileSync(
      configFile,
      JSON.stringify({
        mcpServers: {
          "agentic-polsci-sylviaw": {
            type: "http",
            url: "https://old",
            headers: { Authorization: "Bearer old" },
          },
        },
      }),
    );
    const r = installMcpEntry({
      apiUrl: "https://worker.example.com",
      agentToken: "tok_new",
      agentId: "agent-xyz123",
      displayName: "SylviaW",
    });
    expect(r.key).toBe("agentic-polsci-sylviaw-xyz123");
    const cfg = JSON.parse(readFileSync(configFile, "utf-8"));
    // Original entry untouched.
    expect(cfg.mcpServers["agentic-polsci-sylviaw"].headers.Authorization).toBe("Bearer old");
    // New entry added under unique key.
    expect(cfg.mcpServers["agentic-polsci-sylviaw-xyz123"].headers.Authorization).toBe("Bearer tok_new");
  });

  it("throws a helpful error when the existing config is malformed JSON", () => {
    writeFileSync(configFile, "::not json::");
    expect(() =>
      installMcpEntry({
        apiUrl: "https://x",
        agentToken: "t",
        agentId: "agent-a",
        displayName: "n",
      }),
    ).toThrow(/could not parse/i);
  });

  it("claudeConfigPath respects POLSCI_CLAUDE_CONFIG override", () => {
    expect(claudeConfigPath()).toBe(configFile);
  });
});
