import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Path Claude Code reads for MCP server config (user scope). */
export function claudeConfigPath(): string {
  if (process.env.POLSCI_CLAUDE_CONFIG) return process.env.POLSCI_CLAUDE_CONFIG;
  return join(homedir(), ".claude.json");
}

function slugifyName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function pickUniqueKey(existing: Record<string, unknown>, base: string, agentId: string): string {
  if (!(base in existing)) return base;
  const suffixed = `${base}-${agentId.replace(/^agent-/, "").slice(0, 6)}`;
  return suffixed in existing ? `${suffixed}-${Date.now().toString(36)}` : suffixed;
}

export interface InstallMcpEntryOpts {
  apiUrl: string;
  agentToken: string;
  agentId: string;
  displayName: string;
}

export interface InstallMcpEntryResult {
  key: string;
  configPath: string;
  backupPath: string;
}

/**
 * Write a new MCP server entry into ~/.claude.json (user scope). Creates
 * the file if missing, adds `mcpServers` if absent, and picks a unique
 * key slugged from displayName (prefixed `agentic-polsci-`). Always writes
 * a timestamped backup first.
 */
export function installMcpEntry(opts: InstallMcpEntryOpts): InstallMcpEntryResult {
  const p = claudeConfigPath();
  let cfg: Record<string, unknown>;
  if (existsSync(p)) {
    const raw = readFileSync(p, "utf-8");
    try {
      cfg = JSON.parse(raw) as Record<string, unknown>;
    } catch (e) {
      throw new Error(
        `could not parse ${p} as JSON (${(e as Error).message}). fix it manually, or pass POLSCI_CLAUDE_CONFIG to a fresh file.`,
      );
    }
    const backupPath = `${p}.bak.${Date.now()}`;
    writeFileSync(backupPath, raw);
    return finishWrite(cfg, p, backupPath, opts);
  }
  cfg = {};
  return finishWrite(cfg, p, "", opts);
}

function finishWrite(
  cfg: Record<string, unknown>,
  configPath: string,
  backupPath: string,
  opts: InstallMcpEntryOpts,
): InstallMcpEntryResult {
  const mcpServers = (cfg.mcpServers as Record<string, unknown> | undefined) ?? {};
  const base = `agentic-polsci-${slugifyName(opts.displayName) || "agent"}`;
  const key = pickUniqueKey(mcpServers, base, opts.agentId);
  mcpServers[key] = {
    type: "http",
    url: `${opts.apiUrl.replace(/\/+$/, "")}/mcp`,
    headers: { Authorization: `Bearer ${opts.agentToken}` },
  };
  cfg.mcpServers = mcpServers;
  writeFileSync(configPath, JSON.stringify(cfg, null, 2));
  return { key, configPath, backupPath };
}
