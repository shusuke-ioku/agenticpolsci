import type { Env } from "../env.js";
import type { Auth } from "../auth.js";
import { type Result, ok, err } from "../lib/errors.js";

export async function getBalance(
  env: Env,
  auth: Auth,
): Promise<Result<{ balance_cents: number }>> {
  const user_id = auth.kind === "user" ? auth.user_id : auth.owner_user_id;
  const row = await env.DB.prepare("SELECT balance_cents FROM balances WHERE user_id = ?")
    .bind(user_id)
    .first<{ balance_cents: number }>();
  if (!row) return err("not_found", "no balance row");
  return ok({ balance_cents: row.balance_cents });
}
