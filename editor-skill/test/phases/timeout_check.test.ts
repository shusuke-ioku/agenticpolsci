import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { seedAgent, seedPaper } from "../fixtures/public-repo-fixture.js";
import { cleanupTempDir } from "../fixtures/git-fixture.js";
import { runTimeoutCheck } from "../../src/phases/timeout_check.js";

describe("timeout_check", () => {
  let root: string;
  beforeEach(() => {
    root = join(tmpdir(), `timeout-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(root, { recursive: true });
  });
  afterEach(() => cleanupTempDir(root));

  it("flips overdue invitations to timed_out and reports them", async () => {
    const oldTs = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    seedPaper(root, {
      paper_id: "paper-2026-0001",
      status: "pending",
      author_agent_ids: ["agent-author"],
      desk_reviewed_at: "2026-04-18T14:00:00Z",
      invitations: [
        {
          review_id: "review-001",
          reviewer_agent_id: "agent-r1",
          status: "pending",
          due_at: oldTs,
        },
      ],
    });
    const result = await runTimeoutCheck({ publicRepoPath: root });
    expect(result.timedOut).toHaveLength(1);
    expect(result.timedOut[0].review_id).toBe("review-001");
    const flipped = readFileSync(
      join(root, "papers/paper-2026-0001/reviews/review-001.invitation.yml"),
      "utf-8",
    );
    expect(flipped).toContain("status: timed_out");
  });

  it("leaves not-yet-overdue invitations alone", async () => {
    const futureTs = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    seedPaper(root, {
      paper_id: "paper-2026-0002",
      status: "pending",
      author_agent_ids: ["agent-author"],
      desk_reviewed_at: "2026-04-18T14:00:00Z",
      invitations: [
        {
          review_id: "review-001",
          reviewer_agent_id: "agent-r1",
          status: "pending",
          due_at: futureTs,
        },
      ],
    });
    const result = await runTimeoutCheck({ publicRepoPath: root });
    expect(result.timedOut).toHaveLength(0);
  });

  it("bumps reviewer's reviews_timed_out stat on the agent profile", async () => {
    seedAgent(root, { agent_id: "agent-r1", owner_user_id: "user-u2" });
    const oldTs = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    seedPaper(root, {
      paper_id: "paper-2026-0003",
      status: "pending",
      author_agent_ids: ["agent-author"],
      desk_reviewed_at: "2026-04-18T14:00:00Z",
      invitations: [
        {
          review_id: "review-001",
          reviewer_agent_id: "agent-r1",
          status: "pending",
          due_at: oldTs,
        },
      ],
    });
    await runTimeoutCheck({ publicRepoPath: root });
    const profile = readFileSync(join(root, "agents/agent-r1.yml"), "utf-8");
    expect(profile).toMatch(/reviews_timed_out:\s*1/);
  });
});
