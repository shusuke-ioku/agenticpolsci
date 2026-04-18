import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { seedAgent, seedPaper } from "../fixtures/public-repo-fixture.js";
import { cleanupTempDir } from "../fixtures/git-fixture.js";
import { buildWorkQueue } from "../../src/lib/state.js";

describe("state walker", () => {
  let root: string;
  beforeEach(() => {
    root = join(tmpdir(), `state-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(root, { recursive: true });
  });
  afterEach(() => cleanupTempDir(root));

  it("classifies a pending paper with no desk_reviewed_at as needs_desk_review", () => {
    seedPaper(root, {
      paper_id: "paper-2026-0001",
      status: "pending",
      author_agent_ids: ["agent-xxxxxxxxxx"],
    });
    const q = buildWorkQueue(root);
    expect(q.needs_desk_review.map((p) => p.paper_id)).toEqual(["paper-2026-0001"]);
    expect(q.needs_dispatch).toEqual([]);
    expect(q.needs_decide).toEqual([]);
  });

  it("classifies a desk-accepted paper without invitations as needs_dispatch", () => {
    seedPaper(root, {
      paper_id: "paper-2026-0002",
      status: "pending",
      author_agent_ids: ["agent-xxxxxxxxxx"],
      desk_reviewed_at: "2026-04-18T14:00:00Z",
    });
    const q = buildWorkQueue(root);
    expect(q.needs_dispatch.map((p) => p.paper_id)).toEqual(["paper-2026-0002"]);
  });

  it("classifies a paper with all reviews submitted as needs_decide", () => {
    seedPaper(root, {
      paper_id: "paper-2026-0003",
      status: "pending",
      author_agent_ids: ["agent-xxxxxxxxxx"],
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
    const q = buildWorkQueue(root);
    expect(q.needs_decide.map((p) => p.paper_id)).toEqual(["paper-2026-0003"]);
  });

  it("flags invitations past due as needs_timeout_check", () => {
    const oldTs = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    seedPaper(root, {
      paper_id: "paper-2026-0004",
      status: "pending",
      author_agent_ids: ["agent-xxxxxxxxxx"],
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
    const q = buildWorkQueue(root);
    expect(q.needs_timeout_check.map((x) => x.paper_id)).toEqual(["paper-2026-0004"]);
  });

  it("lists eligible registered agents (review_opt_in and active)", () => {
    seedAgent(root, { agent_id: "agent-a", owner_user_id: "user-u1", review_opt_in: true });
    seedAgent(root, {
      agent_id: "agent-b",
      owner_user_id: "user-u2",
      review_opt_in: false,
    });
    seedAgent(root, {
      agent_id: "agent-c",
      owner_user_id: "user-u3",
      review_opt_in: true,
      status: "suspended",
    });
    const q = buildWorkQueue(root);
    const ids = q.eligible_agent_pool.map((a) => a.agent_id).sort();
    expect(ids).toEqual(["agent-a"]);
  });
});
