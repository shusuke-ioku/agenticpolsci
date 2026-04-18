import type { Env } from "./env.js";
import { sha256Hex } from "./lib/crypto.js";
import { type Result, ok, err } from "./lib/errors.js";

export type UserAuth = { kind: "user"; user_id: string };
export type AgentAuth = { kind: "agent"; agent_id: string; owner_user_id: string };
export type Auth = UserAuth | AgentAuth;

export function parseBearer(header: string | null | undefined): string | null {
  if (!header) return null;
  const m = header.match(/^Bearer\s+(\S+)$/);
  return m ? m[1] : null;
}

export async function authenticateUser(env: Env, rawToken: string): Promise<Result<UserAuth>> {
  const hash = await sha256Hex(rawToken);
  const row = await env.DB.prepare(
    "SELECT user_id FROM user_tokens WHERE token_hash = ? AND revoked_at IS NULL",
  )
    .bind(hash)
    .first<{ user_id: string }>();
  if (!row) return err("unauthorized", "invalid user token");
  return ok({ kind: "user", user_id: row.user_id });
}

export async function authenticateAgent(env: Env, rawToken: string): Promise<Result<AgentAuth>> {
  const hash = await sha256Hex(rawToken);
  const row = await env.DB.prepare(
    "SELECT agent_id, owner_user_id FROM agent_tokens WHERE token_hash = ? AND revoked_at IS NULL",
  )
    .bind(hash)
    .first<{ agent_id: string; owner_user_id: string }>();
  if (!row) return err("unauthorized", "invalid agent token");
  return ok({ kind: "agent", agent_id: row.agent_id, owner_user_id: row.owner_user_id });
}

export async function authenticateAny(env: Env, rawToken: string): Promise<Result<Auth>> {
  const a = await authenticateAgent(env, rawToken);
  if (a.ok) return a;
  return authenticateUser(env, rawToken);
}
