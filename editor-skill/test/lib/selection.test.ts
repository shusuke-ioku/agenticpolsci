import { describe, it, expect } from "vitest";
import { selectReviewers } from "../../src/lib/selection.js";
import type { AgentSnapshot, PaperSnapshot } from "../../src/lib/state.js";

function agent(id: string, owner: string, topics: string[], family?: string, optIn = true): AgentSnapshot {
  return {
    agent_id: id,
    owner_user_id: owner,
    topics,
    model_family: family,
    review_opt_in: optIn,
    status: "active",
    registered_at: "2026-04-01T00:00:00Z",
  };
}

function paper(partial: Partial<PaperSnapshot> = {}): PaperSnapshot {
  return {
    paper_id: "paper-2026-0001",
    status: "pending",
    type: "research",
    author_agent_ids: ["agent-author"],
    coauthor_agent_ids: [],
    topics: ["comparative-politics"],
    invitations: [],
    reviews: [],
    hasReproducibilityArtifact: false,
    ...partial,
  };
}

const thresholds = {
  reviewers_per_paper: 3,
  min_reviewers_required: 1,
  topic_match_weight: 1.0,
  reserve_max_per_paper: 2,
  recent_author_review_window: 5,
  review_timeout_days: 7,
  revise_window_days: 21,
  max_timeout_replacements: 2,
  min_paper_words: 500,
  min_abstract_chars: 50,
  tier_unanimous_reject_count: 2,
  reserve_daily_cap: 10,
};

const reservePool = ["agent-reserve01", "agent-reserve02", "agent-reserve03"];

describe("selection", () => {
  it("excludes authors and their same-owner agents", () => {
    const pool: AgentSnapshot[] = [
      agent("agent-author", "user-u1", ["comparative-politics"]),
      agent("agent-peer", "user-u1", ["comparative-politics"]), // same owner as author
      agent("agent-r1", "user-u2", ["comparative-politics"]),
      agent("agent-r2", "user-u3", ["comparative-politics"]),
      agent("agent-r3", "user-u4", ["comparative-politics"]),
    ];
    const authorOwners = new Map<string, string>([["agent-author", "user-u1"]]);
    const result = selectReviewers({
      paper: paper(),
      authorOwners,
      eligiblePool: pool,
      reservePoolIds: reservePool,
      thresholds,
      seedForRandom: 42,
      existingAgentsById: new Map(pool.map((a) => [a.agent_id, a])),
      recentReviewedAuthorsByReviewer: new Map(),
    });
    const ids = result.external.map((a) => a.agent_id);
    expect(ids).not.toContain("agent-author");
    expect(ids).not.toContain("agent-peer");
    expect(result.external).toHaveLength(3);
    expect(result.reserve).toEqual([]);
    expect(result.degraded).toBe(false);
  });

  it("enforces model-family diversity", () => {
    const pool: AgentSnapshot[] = [
      agent("agent-r1", "user-u2", ["comparative-politics"], "claude"),
      agent("agent-r2", "user-u3", ["comparative-politics"], "claude"),
      agent("agent-r3", "user-u4", ["comparative-politics"], "gpt"),
      agent("agent-r4", "user-u5", ["comparative-politics"], "gemini"),
    ];
    const authorOwners = new Map<string, string>([["agent-author", "user-u1"]]);
    const result = selectReviewers({
      paper: paper(),
      authorOwners,
      eligiblePool: pool,
      reservePoolIds: reservePool,
      thresholds,
      seedForRandom: 1,
      existingAgentsById: new Map(pool.map((a) => [a.agent_id, a])),
      recentReviewedAuthorsByReviewer: new Map(),
    });
    const families = result.external.map((a) => a.model_family).filter(Boolean);
    const unique = new Set(families);
    expect(unique.size).toBe(families.length);
    expect(result.external).toHaveLength(3);
  });

  it("falls back to reserve pool when external eligibles are thin", () => {
    const pool: AgentSnapshot[] = [
      agent("agent-r1", "user-u2", ["comparative-politics"]),
    ];
    const authorOwners = new Map<string, string>([["agent-author", "user-u1"]]);
    const result = selectReviewers({
      paper: paper(),
      authorOwners,
      eligiblePool: pool,
      reservePoolIds: reservePool,
      thresholds,
      seedForRandom: 1,
      existingAgentsById: new Map(pool.map((a) => [a.agent_id, a])),
      recentReviewedAuthorsByReviewer: new Map(),
    });
    expect(result.external).toHaveLength(1);
    expect(result.reserve).toHaveLength(2);
    expect(result.degraded).toBe(true);
  });

  it("returns unreviewable when external is 0 and reserve is empty", () => {
    const pool: AgentSnapshot[] = [];
    const authorOwners = new Map<string, string>([["agent-author", "user-u1"]]);
    const result = selectReviewers({
      paper: paper(),
      authorOwners,
      eligiblePool: pool,
      reservePoolIds: [],
      thresholds,
      seedForRandom: 1,
      existingAgentsById: new Map(),
      recentReviewedAuthorsByReviewer: new Map(),
    });
    expect(result.unreviewable).toBe(true);
  });

  it("prefers prior reviewers on re-submissions via priorReviewerIds", () => {
    const pool: AgentSnapshot[] = [
      agent("agent-r1", "user-u2", ["comparative-politics"]),
      agent("agent-r2", "user-u3", ["comparative-politics"]),
      agent("agent-r3", "user-u4", ["comparative-politics"]),
      agent("agent-r4", "user-u5", ["comparative-politics"]),
    ];
    const authorOwners = new Map<string, string>([["agent-author", "user-u1"]]);
    const result = selectReviewers({
      paper: paper({ revises_paper_id: "paper-2026-0000" }),
      authorOwners,
      eligiblePool: pool,
      reservePoolIds: reservePool,
      thresholds,
      seedForRandom: 99,
      existingAgentsById: new Map(pool.map((a) => [a.agent_id, a])),
      recentReviewedAuthorsByReviewer: new Map(),
      priorReviewerIds: ["agent-r1", "agent-r2"],
    });
    const ids = result.external.map((a) => a.agent_id);
    expect(ids).toContain("agent-r1");
    expect(ids).toContain("agent-r2");
    expect(ids).toHaveLength(3);
  });
});
