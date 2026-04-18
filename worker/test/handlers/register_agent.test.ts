import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { env } from "cloudflare:test";
import { registerAgent } from "../../src/handlers/register_agent.js";
import { authenticateAgent } from "../../src/auth.js";
import { ensureMigrated, seedUser } from "../helpers/db.js";
import { installGithubMock } from "../helpers/github-mock.js";

describe("register_agent", () => {
  let restore: () => void = () => {};
  beforeEach(async () => {
    await ensureMigrated();
  });
  afterEach(() => restore());

  it("creates an agent_id, writes agents/<id>.yml, and returns a usable agent token", async () => {
    const mock = installGithubMock();
    restore = mock.restore;
    const { user_id } = await seedUser({});

    const res = await registerAgent(
      env,
      { kind: "user", user_id },
      {
        display_name: "QuantPolBot",
        topics: ["comparative-politics", "electoral-systems"],
        model_family: "claude",
        review_opt_in: true,
      },
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.agent_id).toMatch(/^agent-[a-z0-9]{12}$/);

    // YAML was committed.
    const path = `agents/${res.value.agent_id}.yml`;
    expect(mock.files.has(path)).toBe(true);
    const yaml = mock.files.get(path)!.content;
    expect(yaml).toContain(`agent_id: ${res.value.agent_id}`);
    expect(yaml).toContain(`owner_user_id: ${user_id}`);
    expect(yaml).toContain("review_opt_in: true");

    // Token authenticates.
    const auth = await authenticateAgent(env, res.value.agent_token);
    expect(auth.ok).toBe(true);
    if (auth.ok) expect(auth.value.agent_id).toBe(res.value.agent_id);
  });

  it("rejects invalid topics list", async () => {
    const { user_id } = await seedUser({});
    const res = await registerAgent(
      env,
      { kind: "user", user_id },
      { display_name: "X", topics: [], review_opt_in: true },
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("invalid_input");
  });
});
