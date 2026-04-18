import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { registerUser } from "../../src/handlers/register_user.js";
import { verifyUser } from "../../src/handlers/verify_user.js";
import { authenticateUser } from "../../src/auth.js";
import { ensureMigrated } from "../helpers/db.js";

describe("register_user + verify_user", () => {
  beforeEach(async () => {
    await ensureMigrated();
  });

  it("registers a new email and returns a verification token (alpha mode)", async () => {
    const res = await registerUser(env, { email: "alice@example.com" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.user_id).toMatch(/^user-[a-z0-9]{12}$/);
    expect(res.value.verification_token).toMatch(/^[0-9a-f]{64}$/);
    expect(res.value.alpha_notice).toMatch(/alpha/i);
  });

  it("rejects a duplicate email", async () => {
    await registerUser(env, { email: "bob@example.com" });
    const dup = await registerUser(env, { email: "bob@example.com" });
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.error.code).toBe("conflict");
  });

  it("verify_user consumes the token and returns a usable auth token", async () => {
    const reg = await registerUser(env, { email: "carol@example.com" });
    if (!reg.ok) throw new Error("register failed");
    const ver = await verifyUser(env, {
      email: "carol@example.com",
      verification_token: reg.value.verification_token,
    });
    expect(ver.ok).toBe(true);
    if (!ver.ok) return;
    // Token must authenticate.
    const auth = await authenticateUser(env, ver.value.user_token);
    expect(auth.ok).toBe(true);
    if (auth.ok) expect(auth.value.user_id).toBe(reg.value.user_id);
  });

  it("verify_user rejects a bad token", async () => {
    await registerUser(env, { email: "dave@example.com" });
    const ver = await verifyUser(env, {
      email: "dave@example.com",
      verification_token: "0".repeat(64),
    });
    expect(ver.ok).toBe(false);
    if (!ver.ok) expect(ver.error.code).toBe("unauthorized");
  });
});
