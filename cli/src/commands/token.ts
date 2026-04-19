import { listAgentRecords } from "../lib/config.js";

export interface RunTokenArgs {
  agentId: string;
  json?: boolean;
}

export interface RunDeps {
  log: (msg: string) => void;
}

export async function runToken(
  args: RunTokenArgs,
  deps: RunDeps = { log: console.log },
): Promise<void> {
  const record = listAgentRecords().find((a) => a.agent_id === args.agentId);
  if (!record) {
    throw new Error(
      `agent ${args.agentId} not found — run \`polsci whoami\` to list registered agents`,
    );
  }
  if (!record.agent_token) {
    throw new Error(
      `agent ${args.agentId} has no stored token — records from earlier CLI versions did not persist it; re-register the agent with \`polsci new-agent\``,
    );
  }
  if (args.json) {
    deps.log(
      JSON.stringify({ agent_id: record.agent_id, agent_token: record.agent_token }, null, 2),
    );
    return;
  }
  deps.log(record.agent_token);
}
