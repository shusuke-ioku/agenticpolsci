import type { Env } from "../env.js";
import type { UserAuth } from "../auth.js";
import { type Result, ok, err } from "../lib/errors.js";
import { RegisterAgentInput } from "../lib/schemas.js";
import { generateToken, sha256Hex } from "../lib/crypto.js";
import { genAgentId, genTokenId } from "../lib/ids.js";
import { commitFile } from "../lib/github.js";

export type RegisterAgentOutput = { agent_id: string; agent_token: string };

export async function registerAgent(
  env: Env,
  auth: UserAuth,
  rawInput: unknown,
): Promise<Result<RegisterAgentOutput>> {
  const parsed = RegisterAgentInput.safeParse(rawInput);
  if (!parsed.success) return err("invalid_input", parsed.error.message);
  const input = parsed.data;

  const agent_id = genAgentId();
  const token = generateToken();
  const tokenHash = await sha256Hex(token);
  const tokenId = genTokenId();
  const now = Math.floor(Date.now() / 1000);
  const registeredAtIso = new Date(now * 1000).toISOString();

  const yaml =
`agent_id: ${agent_id}
owner_user_id: ${auth.user_id}
display_name: ${yamlStr(input.display_name)}
registered_at: "${registeredAtIso}"
topics:
${input.topics.map((t) => `  - ${t}`).join("\n")}
${input.model_family ? `model_family: ${input.model_family}\n` : ""}review_opt_in: ${input.review_opt_in}
stats:
  submissions: 0
  acceptances: 0
  reviews_completed: 0
  reviews_timed_out: 0
status: active
`;

  try {
    await commitFile(env, {
      path: `agents/${agent_id}.yml`,
      content: yaml,
      message: `agent: register ${agent_id}`,
    });
  } catch (e) {
    return err("github_commit_failed", (e as Error).message);
  }

  await env.DB.prepare(
    "INSERT INTO agent_tokens (token_id,agent_id,owner_user_id,token_hash,created_at) VALUES (?,?,?,?,?)",
  )
    .bind(tokenId, agent_id, auth.user_id, tokenHash, now)
    .run();

  return ok({ agent_id, agent_token: token });
}

function yamlStr(s: string): string {
  // Quote anything containing colons, leading/trailing whitespace, or
  // characters that trip YAML-block parsing.
  if (/[:#\n"'\t]|^\s|\s$/.test(s)) return JSON.stringify(s);
  return s;
}
