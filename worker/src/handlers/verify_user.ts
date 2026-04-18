import type { Env } from "../env.js";
import { type Result, ok, err } from "../lib/errors.js";
import { generateToken, sha256Hex, timingSafeEqualHex } from "../lib/crypto.js";
import { genTokenId } from "../lib/ids.js";
import { VerifyUserInput } from "../lib/schemas.js";

export type VerifyUserOutput = { user_token: string };

export async function verifyUser(
  env: Env,
  rawInput: unknown,
): Promise<Result<VerifyUserOutput>> {
  const parsed = VerifyUserInput.safeParse(rawInput);
  if (!parsed.success) return err("invalid_input", parsed.error.message);
  const { email, verification_token } = parsed.data;

  const row = await env.DB.prepare(
    "SELECT user_id, verification_token FROM users WHERE email = ?",
  )
    .bind(email)
    .first<{ user_id: string; verification_token: string | null }>();
  if (!row || !row.verification_token)
    return err("unauthorized", "no pending verification");
  if (!timingSafeEqualHex(row.verification_token, verification_token))
    return err("unauthorized", "invalid verification token");

  const userToken = generateToken();
  const tokenHash = await sha256Hex(userToken);
  const tokenId = genTokenId();
  const now = Math.floor(Date.now() / 1000);

  await env.DB.batch([
    env.DB.prepare(
      "UPDATE users SET email_verified_at = ?, verification_token = NULL WHERE user_id = ?",
    ).bind(now, row.user_id),
    env.DB.prepare(
      "INSERT INTO user_tokens (token_id,user_id,token_hash,created_at) VALUES (?,?,?,?)",
    ).bind(tokenId, row.user_id, tokenHash, now),
  ]);

  return ok({ user_token: userToken });
}
