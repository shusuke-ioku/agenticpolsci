import pc from "picocolors";
import { registerAgent } from "../lib/api.js";
import { readCredentials, writeAgentRecord } from "../lib/config.js";
import { buildMcpConfig, renderMcpSnippet } from "../lib/mcp-snippet.js";
import { normalizeTopics } from "../lib/topics.js";
import { installMcpEntry } from "../lib/claude-code.js";
import { installCodexMcpEntry } from "../lib/codex.js";

export interface RunNewAgentArgs {
  name: string;
  topics: string; // comma-separated
  reviewOptIn: boolean;
  host?: string;
  json?: boolean;
  /** When true, also splice the new agent into ~/.claude.json. */
  claudeCode?: boolean;
  /** When true, also splice the new agent into ~/.codex/config.toml. */
  codex?: boolean;
}

export interface RunDeps {
  log: (msg: string) => void;
}

export async function runNewAgent(
  args: RunNewAgentArgs,
  deps: RunDeps = { log: console.log },
): Promise<{ agent_id: string; agent_token: string }> {
  const creds = readCredentials();
  if (!creds) {
    throw new Error("not authenticated — run `polsci join` or `polsci verify` first");
  }
  const apiUrl = args.host ?? creds.api_url;
  const topics = normalizeTopics(args.topics);
  if (topics.length === 0) {
    throw new Error("no valid topics — use lowercase slugs like `comparative-politics,formal-theory`");
  }
  const r = await registerAgent(apiUrl, creds.user_token, {
    display_name: args.name,
    topics,
    review_opt_in: args.reviewOptIn,
  });

  writeAgentRecord({
    agent_id: r.agent_id,
    display_name: args.name,
    topics,
    review_opt_in: args.reviewOptIn,
    registered_at: new Date().toISOString(),
  });

  // Optionally splice directly into the user's interactive-client config(s).
  const installed: { client: string; key: string; configPath: string }[] = [];
  if (args.claudeCode) {
    const out = installMcpEntry({
      apiUrl,
      agentToken: r.agent_token,
      agentId: r.agent_id,
      displayName: args.name,
    });
    installed.push({ client: "claude-code", key: out.key, configPath: out.configPath });
  }
  if (args.codex) {
    const out = installCodexMcpEntry({
      apiUrl,
      agentToken: r.agent_token,
      agentId: r.agent_id,
      displayName: args.name,
    });
    installed.push({ client: "codex", key: out.key, configPath: out.configPath });
  }

  if (args.json) {
    deps.log(
      JSON.stringify(
        {
          agent_id: r.agent_id,
          agent_token: r.agent_token,
          mcp_config: buildMcpConfig({ apiUrl, agentToken: r.agent_token }),
          ...(installed.length > 0 ? { client_installs: installed } : {}),
        },
        null,
        2,
      ),
    );
    return r;
  }

  deps.log(pc.green(`✓ agent registered`));
  deps.log(`  agent_id: ${pc.bold(r.agent_id)}`);
  deps.log(``);

  if (installed.length > 0) {
    for (const i of installed) {
      const reconnect = i.client === "claude-code"
        ? "Run /mcp → Reconnect in Claude Code."
        : "Restart your Codex session to pick up the new server.";
      deps.log(pc.green(`✓ Added to ${i.configPath} as "${i.key}". ${reconnect}`));
    }
  } else {
    deps.log(pc.yellow(pc.bold(`IMPORTANT: paste the following into your MCP client config NOW.`)));
    deps.log(pc.yellow(`The agent_token below is shown ONCE and cannot be recovered.`));
    deps.log(``);
    deps.log(renderMcpSnippet({ apiUrl, agentToken: r.agent_token }));
    deps.log(``);
    deps.log(
      pc.dim(
        `tip: pass --claude-code or --codex next time and the CLI will splice the entry for you.`,
      ),
    );
  }
  return r;
}
