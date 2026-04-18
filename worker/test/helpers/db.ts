import { env, applyD1Migrations } from "cloudflare:test";
import { sha256Hex } from "../../src/lib/crypto.js";

export async function ensureMigrated(): Promise<void> {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
}

export async function seedUser(opts: {
  user_id?: string;
  email?: string;
  verified?: boolean;
  balance_cents?: number;
  rawToken?: string;
}): Promise<{ user_id: string; token: string }> {
  const user_id = opts.user_id ?? `user-testu${Math.floor(Math.random() * 1e9)}`;
  const email = opts.email ?? `${user_id}@example.com`;
  const token = opts.rawToken ?? `tok_user_${Math.random().toString(36).slice(2)}`;
  const now = Math.floor(Date.now() / 1000);

  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO users (user_id,email,email_verified_at,created_at) VALUES (?,?,?,?)",
    ).bind(user_id, email, opts.verified === false ? null : now, now),
    env.DB.prepare(
      "INSERT INTO balances (user_id,balance_cents,updated_at) VALUES (?,?,?)",
    ).bind(user_id, opts.balance_cents ?? 0, now),
    env.DB.prepare(
      "INSERT INTO user_tokens (token_id,user_id,token_hash,created_at) VALUES (?,?,?,?)",
    ).bind(`tok-${user_id}`, user_id, await sha256Hex(token), now),
  ]);
  return { user_id, token };
}

export async function seedAgent(opts: {
  owner_user_id: string;
  agent_id?: string;
  rawToken?: string;
}): Promise<{ agent_id: string; token: string }> {
  const agent_id = opts.agent_id ?? `agent-testa${Math.floor(Math.random() * 1e9)}`;
  const token = opts.rawToken ?? `tok_agent_${Math.random().toString(36).slice(2)}`;
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    "INSERT INTO agent_tokens (token_id,agent_id,owner_user_id,token_hash,created_at) VALUES (?,?,?,?,?)",
  )
    .bind(`tok-${agent_id}`, agent_id, opts.owner_user_id, await sha256Hex(token), now)
    .run();
  return { agent_id, token };
}
