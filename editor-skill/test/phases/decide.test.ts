import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { seedPaper } from "../fixtures/public-repo-fixture.js";
import { seedPolicyRepo } from "../fixtures/policy-fixture.js";
import { cleanupTempDir } from "../fixtures/git-fixture.js";
import { evaluateTier, commitDecision } from "../../src/phases/decide.js";

describe("decide — evaluateTier", () => {
  let root: string;
  let policy: string;
  beforeEach(() => {
    root = join(tmpdir(), `dec-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    policy = join(tmpdir(), `pol-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(root, { recursive: true });
    seedPolicyRepo(policy);
  });
  afterEach(() => {
    cleanupTempDir(root);
    cleanupTempDir(policy);
  });

  it("2+ reject recommendations → unanimous_reject, auto outcome reject", async () => {
    seedPaper(root, {
      paper_id: "paper-2026-0001",
      status: "pending",
      author_agent_ids: ["agent-author"],
      desk_reviewed_at: "2026-04-18T14:00:00Z",
      invitations: [
        { review_id: "review-001", reviewer_agent_id: "agent-r1", status: "submitted" },
        { review_id: "review-002", reviewer_agent_id: "agent-r2", status: "submitted" },
        { review_id: "review-003", reviewer_agent_id: "agent-r3", status: "submitted" },
      ],
      reviews: [
        { review_id: "review-001", reviewer_agent_id: "agent-r1", recommendation: "reject" },
        { review_id: "review-002", reviewer_agent_id: "agent-r2", recommendation: "reject" },
        { review_id: "review-003", reviewer_agent_id: "agent-r3", recommendation: "accept" },
      ],
    });
    const t = await evaluateTier({ publicRepoPath: root, policyRepoPath: policy, paperId: "paper-2026-0001" });
    expect(t.tier).toBe("unanimous_reject");
    expect(t.autoOutcome).toBe("reject");
  });

  it("all accept → unanimous_accept", async () => {
    seedPaper(root, {
      paper_id: "paper-2026-0002",
      status: "pending",
      author_agent_ids: ["agent-author"],
      desk_reviewed_at: "2026-04-18T14:00:00Z",
      invitations: [
        { review_id: "review-001", reviewer_agent_id: "agent-r1", status: "submitted" },
        { review_id: "review-002", reviewer_agent_id: "agent-r2", status: "submitted" },
      ],
      reviews: [
        { review_id: "review-001", reviewer_agent_id: "agent-r1", recommendation: "accept" },
        { review_id: "review-002", reviewer_agent_id: "agent-r2", recommendation: "accept" },
      ],
    });
    const t = await evaluateTier({ publicRepoPath: root, policyRepoPath: policy, paperId: "paper-2026-0002" });
    expect(t.tier).toBe("unanimous_accept");
    expect(t.autoOutcome).toBe("accept");
  });

  it("mixed recommendations → contested (needs subagent)", async () => {
    seedPaper(root, {
      paper_id: "paper-2026-0003",
      status: "pending",
      author_agent_ids: ["agent-author"],
      desk_reviewed_at: "2026-04-18T14:00:00Z",
      invitations: [
        { review_id: "review-001", reviewer_agent_id: "agent-r1", status: "submitted" },
        { review_id: "review-002", reviewer_agent_id: "agent-r2", status: "submitted" },
        { review_id: "review-003", reviewer_agent_id: "agent-r3", status: "submitted" },
      ],
      reviews: [
        { review_id: "review-001", reviewer_agent_id: "agent-r1", recommendation: "accept_with_revisions" },
        { review_id: "review-002", reviewer_agent_id: "agent-r2", recommendation: "major_revisions" },
        { review_id: "review-003", reviewer_agent_id: "agent-r3", recommendation: "accept" },
      ],
    });
    const t = await evaluateTier({ publicRepoPath: root, policyRepoPath: policy, paperId: "paper-2026-0003" });
    expect(t.tier).toBe("contested");
    expect(t.autoOutcome).toBeNull();
  });

  it("replication without reproducibility.md → auto reject", async () => {
    seedPaper(root, {
      paper_id: "paper-2026-0004",
      status: "pending",
      author_agent_ids: ["agent-author"],
      type: "replication",
      desk_reviewed_at: "2026-04-18T14:00:00Z",
      invitations: [
        { review_id: "review-001", reviewer_agent_id: "agent-r1", status: "submitted" },
      ],
      reviews: [
        { review_id: "review-001", reviewer_agent_id: "agent-r1", recommendation: "accept" },
      ],
    });
    const t = await evaluateTier({ publicRepoPath: root, policyRepoPath: policy, paperId: "paper-2026-0004" });
    expect(t.tier).toBe("replication_gate_fail");
    expect(t.autoOutcome).toBe("reject");
  });
});

describe("decide — commitDecision", () => {
  let root: string;
  beforeEach(() => {
    root = join(tmpdir(), `dec-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(root, { recursive: true });
    seedPaper(root, {
      paper_id: "paper-2026-0005",
      status: "pending",
      author_agent_ids: ["agent-author"],
      desk_reviewed_at: "2026-04-18T14:00:00Z",
      invitations: [
        { review_id: "review-001", reviewer_agent_id: "agent-r1", status: "submitted" },
      ],
      reviews: [
        { review_id: "review-001", reviewer_agent_id: "agent-r1", recommendation: "accept_with_revisions" },
      ],
    });
  });
  afterEach(() => cleanupTempDir(root));

  it("accept_with_revisions writes decision.md with revisions_due_at and updates metadata status to revise", async () => {
    const result = await commitDecision({
      publicRepoPath: root,
      paperId: "paper-2026-0005",
      outcome: "accept_with_revisions",
      citedReviews: [
        { review_id: "review-001", accepted_concerns: ["IV strength"], dismissed_concerns: [] },
      ],
      prose: "Editor prose.",
      reviseWindowDays: 21,
      editorAgentId: "editor-aps-001",
    });
    const dec = readFileSync(join(root, "papers/paper-2026-0005/decision.md"), "utf-8");
    expect(dec).toContain("outcome: accept_with_revisions");
    expect(dec).toContain("revisions_due_at:");
    const meta = readFileSync(join(root, "papers/paper-2026-0005/metadata.yml"), "utf-8");
    expect(meta).toMatch(/status: revise/);
    expect(result.commitMessage).toContain("accept_with_revisions");
  });

  it("rejects if cited_reviews references a missing review_id", async () => {
    await expect(
      commitDecision({
        publicRepoPath: root,
        paperId: "paper-2026-0005",
        outcome: "accept",
        citedReviews: [
          { review_id: "review-999", accepted_concerns: [], dismissed_concerns: [] },
        ],
        prose: "Body.",
        reviseWindowDays: 21,
      }),
    ).rejects.toThrow(/review-999/);
  });
});
