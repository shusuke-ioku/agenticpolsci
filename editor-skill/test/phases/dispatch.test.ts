import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { seedAgent, seedPaper } from "../fixtures/public-repo-fixture.js";
import { seedPolicyRepo } from "../fixtures/policy-fixture.js";
import { cleanupTempDir } from "../fixtures/git-fixture.js";
import {
  selectAndWriteInvitations,
  commitReserveReview,
} from "../../src/phases/dispatch.js";

describe("dispatch — selectAndWriteInvitations", () => {
  let root: string;
  let policy: string;
  beforeEach(() => {
    root = join(tmpdir(), `disp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    policy = join(tmpdir(), `pol-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(root, { recursive: true });
    seedPolicyRepo(policy);
    // Seed agents.
    seedAgent(root, { agent_id: "agent-author", owner_user_id: "user-u1" });
    seedAgent(root, { agent_id: "agent-r1", owner_user_id: "user-u2" });
    seedAgent(root, { agent_id: "agent-r2", owner_user_id: "user-u3" });
    seedAgent(root, { agent_id: "agent-r3", owner_user_id: "user-u4" });
    seedPaper(root, {
      paper_id: "paper-2026-0001",
      status: "pending",
      author_agent_ids: ["agent-author"],
      desk_reviewed_at: "2026-04-18T14:00:00Z",
    });
  });
  afterEach(() => {
    cleanupTempDir(root);
    cleanupTempDir(policy);
  });

  it("writes 3 invitation YAMLs for a normal paper with sufficient pool", async () => {
    const result = await selectAndWriteInvitations({
      publicRepoPath: root,
      policyRepoPath: policy,
      paperId: "paper-2026-0001",
      seedForRandom: 42,
    });
    expect(result.invitationsWritten).toHaveLength(3);
    for (const inv of result.invitationsWritten) {
      const path = join(root, "papers/paper-2026-0001/reviews", `${inv.review_id}.invitation.yml`);
      expect(existsSync(path)).toBe(true);
      const body = readFileSync(path, "utf-8");
      expect(body).toContain("status: pending");
      expect(body).toContain("rubric_inline:");
    }
    expect(result.degraded).toBe(false);
  });

  it("falls back to reserve pool and marks degraded_mode", async () => {
    const { unlinkSync } = await import("node:fs");
    unlinkSync(join(root, "agents/agent-r2.yml"));
    unlinkSync(join(root, "agents/agent-r3.yml"));
    const result = await selectAndWriteInvitations({
      publicRepoPath: root,
      policyRepoPath: policy,
      paperId: "paper-2026-0001",
      seedForRandom: 42,
    });
    expect(result.degraded).toBe(true);
    const meta = readFileSync(join(root, "papers/paper-2026-0001/metadata.yml"), "utf-8");
    expect(meta).toMatch(/degraded_mode:/);
    expect(meta).toMatch(/reserve_reviewers_used:/);
  });

  it("returns unreviewable=true when no eligible external and reserve disabled", async () => {
    const { unlinkSync, writeFileSync } = await import("node:fs");
    unlinkSync(join(root, "agents/agent-r1.yml"));
    unlinkSync(join(root, "agents/agent-r2.yml"));
    unlinkSync(join(root, "agents/agent-r3.yml"));
    writeFileSync(join(policy, "selection/reserve-pool.yml"), "reserve_agents: []\n");
    const result = await selectAndWriteInvitations({
      publicRepoPath: root,
      policyRepoPath: policy,
      paperId: "paper-2026-0001",
      seedForRandom: 42,
    });
    expect(result.unreviewable).toBe(true);
    expect(result.invitationsWritten).toEqual([]);
  });
});

describe("dispatch — commitReserveReview", () => {
  let root: string;
  beforeEach(() => {
    root = join(tmpdir(), `res-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(root, { recursive: true });
    seedPaper(root, {
      paper_id: "paper-2026-0001",
      status: "pending",
      author_agent_ids: ["agent-author"],
      desk_reviewed_at: "2026-04-18T14:00:00Z",
      invitations: [
        {
          review_id: "review-003",
          reviewer_agent_id: "agent-reserve01xxxxxxxx",
          status: "pending",
        },
      ],
    });
  });
  afterEach(() => cleanupTempDir(root));

  it("writes review .md and flips invitation to submitted", async () => {
    await commitReserveReview({
      publicRepoPath: root,
      paperId: "paper-2026-0001",
      reviewId: "review-003",
      reviewerAgentId: "agent-reserve01xxxxxxxx",
      recommendation: "accept_with_revisions",
      scores: { novelty: 3, methodology: 4, writing: 3, significance: 3, reproducibility: 4 },
      weakestClaim: "IV strength not shown.",
      falsifyingEvidence: "Placebo on pre-reform years.",
      reviewBody: "Reserve-reviewer body text. ".repeat(10),
    });
    const md = readFileSync(
      join(root, "papers/paper-2026-0001/reviews/review-003.md"),
      "utf-8",
    );
    expect(md).toMatch(/^---/);
    expect(md).toContain("recommendation: accept_with_revisions");
    expect(md).toContain("reviewer_agent_id: agent-reserve01xxxxxxxx");
    const inv = readFileSync(
      join(root, "papers/paper-2026-0001/reviews/review-003.invitation.yml"),
      "utf-8",
    );
    expect(inv).toContain("status: submitted");
  });
});
