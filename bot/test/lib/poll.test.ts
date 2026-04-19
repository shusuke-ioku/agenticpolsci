import { describe, it, expect, vi } from "vitest";
import { runOneTick } from "../../src/lib/poll.js";
import type { Assignment, ReviewDraft } from "../../src/types.js";

const goodDraft: ReviewDraft = {
  recommendation: "accept_with_revisions",
  scores: {
    novelty: 4,
    methodology: 3,
    writing: 4,
    significance: 4,
    reproducibility: 3,
  },
  weakest_claim: "The identification strategy assumes parallel pre-trends.",
  falsifying_evidence: "Pre-treatment trends diverge across the two groups.",
  review_body: "B".repeat(100),
};

const cfg = {
  apiUrl: "https://x",
  agentToken: "tok",
  llmProvider: "anthropic" as const,
  llmApiKey: "sk",
  llmModel: "claude-opus-4-5",
  pollIntervalMs: 1000,
};

describe("runOneTick", () => {
  it("submits a review for each pending assignment", async () => {
    const assignments: Assignment[] = [
      {
        review_id: "review-001",
        paper_id: "paper-2026-0001",
        status: "pending",
        due_at: "2026-05-01T00:00:00Z",
        redacted_manuscript_path: "papers/paper-2026-0001/paper.redacted.md",
        redacted_manuscript: "body",
      },
      {
        review_id: "review-002",
        paper_id: "paper-2026-0002",
        status: "pending",
        due_at: "2026-05-01T00:00:00Z",
        redacted_manuscript_path: "papers/paper-2026-0002/paper.redacted.md",
        redacted_manuscript: "body2",
      },
    ];
    const submit = vi.fn().mockResolvedValue({ status: "submitted" });
    const synthesize = vi.fn().mockResolvedValue(goodDraft);

    const count = await runOneTick(cfg, {
      log: () => {},
      logErr: () => {},
      now: () => new Date(0),
      getAssignments: async () => ({ assignments }),
      submit,
      synthesize,
      sleep: async () => {},
    });

    expect(count).toBe(2);
    expect(synthesize).toHaveBeenCalledTimes(2);
    expect(submit).toHaveBeenCalledTimes(2);
    const firstCall = submit.mock.calls[0];
    expect(firstCall[2]).toMatchObject({
      review_id: "review-001",
      paper_id: "paper-2026-0001",
      recommendation: "accept_with_revisions",
      model_used: "claude-opus-4-5",
    });
  });

  it("keeps going if one review synthesis fails", async () => {
    const assignments: Assignment[] = [
      { review_id: "r1", paper_id: "paper-2026-0001", status: "pending", due_at: "x", redacted_manuscript_path: "p", redacted_manuscript: "body" },
      { review_id: "r2", paper_id: "paper-2026-0002", status: "pending", due_at: "x", redacted_manuscript_path: "p", redacted_manuscript: "body" },
    ];
    const submit = vi.fn().mockResolvedValue({ status: "submitted" });
    const synthesize = vi.fn()
      .mockRejectedValueOnce(new Error("LLM timeout"))
      .mockResolvedValueOnce(goodDraft);

    const count = await runOneTick(cfg, {
      log: () => {},
      logErr: () => {},
      now: () => new Date(0),
      getAssignments: async () => ({ assignments }),
      submit,
      synthesize,
      sleep: async () => {},
    });

    expect(count).toBe(1);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("returns 0 when there are no assignments", async () => {
    const submit = vi.fn();
    const synthesize = vi.fn();
    const count = await runOneTick(cfg, {
      log: () => {},
      logErr: () => {},
      now: () => new Date(0),
      getAssignments: async () => ({ assignments: [] }),
      submit,
      synthesize,
      sleep: async () => {},
    });
    expect(count).toBe(0);
    expect(synthesize).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it("does not throw if the poll itself fails", async () => {
    const count = await runOneTick(cfg, {
      log: () => {},
      logErr: () => {},
      now: () => new Date(0),
      getAssignments: async () => {
        throw new Error("network unreachable");
      },
      submit: vi.fn(),
      synthesize: vi.fn(),
      sleep: async () => {},
    });
    expect(count).toBe(0);
  });
});
