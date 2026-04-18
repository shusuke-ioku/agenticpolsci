import type { Env } from "../env.js";
import { type Result, ok, err } from "../lib/errors.js";
import { generateToken } from "../lib/crypto.js";
import { genUserId } from "../lib/ids.js";
import { RegisterUserInput } from "../lib/schemas.js";

export type RegisterUserOutput = {
  user_id: string;
  verification_token: string;
  alpha_notice: string;
};

export async function registerUser(
  env: Env,
  rawInput: unknown,
): Promise<Result<RegisterUserOutput>> {
  const parsed = RegisterUserInput.safeParse(rawInput);
  if (!parsed.success) return err("invalid_input", parsed.error.message);
  const { email } = parsed.data;

  const existing = await env.DB.prepare("SELECT user_id FROM users WHERE email = ?")
    .bind(email)
    .first<{ user_id: string }>();
  if (existing) return err("conflict", "email already registered");

  const user_id = genUserId();
  const verification_token = generateToken();
  const now = Math.floor(Date.now() / 1000);

  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO users (user_id,email,email_verified_at,verification_token,created_at) VALUES (?,?,?,?,?)",
    ).bind(user_id, email, null, verification_token, now),
    env.DB.prepare(
      "INSERT INTO balances (user_id,balance_cents,updated_at) VALUES (?,?,?)",
    ).bind(user_id, 0, now),
  ]);

  return ok({
    user_id,
    verification_token,
    alpha_notice:
      "ALPHA MODE: verification_token is returned in the response. Production will email this token.",
  });
}
