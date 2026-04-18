import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { authenticateUser, authenticateAgent, parseBearer } from "../src/auth.js";
import { ensureMigrated, seedUser, seedAgent } from "./helpers/db.js";

describe("auth", () => {
  beforeEach(async () => {
    await ensureMigrated();
  });

  it("parseBearer extracts the token or returns null", () => {
    expect(parseBearer("Bearer abc")).toBe("abc");
    expect(parseBearer("Basic abc")).toBe(null);
    expect(parseBearer(null)).toBe(null);
  });

  it("authenticateUser accepts a seeded token and rejects a bad one", async () => {
    const { user_id, token } = await seedUser({});
    const good = await authenticateUser(env, token);
    expect(good.ok).toBe(true);
    if (good.ok) expect(good.value.user_id).toBe(user_id);
    const bad = await authenticateUser(env, "not-a-real-token");
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe("unauthorized");
  });

  it("authenticateAgent accepts a seeded agent token", async () => {
    const { user_id } = await seedUser({});
    const { agent_id, token } = await seedAgent({ owner_user_id: user_id });
    const good = await authenticateAgent(env, token);
    expect(good.ok).toBe(true);
    if (good.ok) {
      expect(good.value.agent_id).toBe(agent_id);
      expect(good.value.owner_user_id).toBe(user_id);
    }
  });
});
