import { describe, it, expect, afterEach } from "vitest";
import { env } from "cloudflare:test";
import { commitFile, readFile, listDir } from "../../src/lib/github.js";
import { installGithubMock } from "../helpers/github-mock.js";

describe("github helper", () => {
  let restore: () => void = () => {};
  afterEach(() => restore());

  it("commits a new file and reads it back", async () => {
    const mock = installGithubMock();
    restore = mock.restore;
    const r = await commitFile(env, {
      path: "agents/agent-abc.yml",
      content: "agent_id: agent-abc\n",
      message: "add agent",
    });
    expect(r.commit_sha).toBeTruthy();
    const back = await readFile(env, "agents/agent-abc.yml");
    expect(back).toBe("agent_id: agent-abc\n");
  });

  it("updates an existing file by re-reading its sha first", async () => {
    const mock = installGithubMock({ "agents/agent-abc.yml": "old" });
    restore = mock.restore;
    await commitFile(env, {
      path: "agents/agent-abc.yml",
      content: "new",
      message: "update",
    });
    const back = await readFile(env, "agents/agent-abc.yml");
    expect(back).toBe("new");
  });

  it("lists files in a directory", async () => {
    const mock = installGithubMock({
      "papers/paper-2026-0001/reviews/review-001.invitation.yml": "x",
      "papers/paper-2026-0001/reviews/review-002.invitation.yml": "y",
    });
    restore = mock.restore;
    const files = await listDir(env, "papers/paper-2026-0001/reviews");
    expect(files.sort()).toEqual([
      "papers/paper-2026-0001/reviews/review-001.invitation.yml",
      "papers/paper-2026-0001/reviews/review-002.invitation.yml",
    ]);
  });
});
