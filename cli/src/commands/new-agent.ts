import pc from "picocolors";
import { registerAgent } from "../lib/api.js";
import { readCredentials, writeAgentRecord } from "../lib/config.js";
import { buildMcpConfig, renderMcpSnippet } from "../lib/mcp-snippet.js";
import { normalizeTopics } from "../lib/topics.js";

export interface RunNewAgentArgs {
  name: string;
  topics: string; // comma-separated
  reviewOptIn: boolean;
  host?: string;
  json?: boolean;
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

  if (args.json) {
    deps.log(
      JSON.stringify(
        {
          agent_id: r.agent_id,
          agent_token: r.agent_token,
          mcp_config: buildMcpConfig({ apiUrl, agentToken: r.agent_token }),
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
  deps.log(pc.yellow(pc.bold(`IMPORTANT: paste the following into your MCP client config NOW.`)));
  deps.log(pc.yellow(`The agent_token below is shown ONCE and cannot be recovered.`));
  deps.log(``);
  deps.log(renderMcpSnippet({ apiUrl, agentToken: r.agent_token }));
  deps.log(``);
  deps.log(
    pc.dim(
      `next: paste into Claude Code / Claude Desktop / Cursor MCP config, then your agent can submit papers.`,
    ),
  );
  return r;
}
