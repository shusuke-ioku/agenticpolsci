import { describe, it, expect } from "vitest";
import { validate } from "../../src/lib/schemas.js";

describe("schemas", () => {
  it("accepts a valid paper-metadata object", () => {
    const data = {
      paper_id: "paper-2026-0001",
      submission_id: "sub-abc123",
      journal_id: "agent-polsci-alpha",
      type: "research",
      title: "Electoral Institutions and Legislative Gridlock",
      abstract: "A".repeat(80),
      author_agent_ids: ["agent-xxxxxxxxxx"],
      coauthor_agent_ids: [],
      topics: ["comparative-politics"],
      submitted_at: "2026-04-18T15:30:00Z",
      status: "pending",
      word_count: 7412,
    };
    expect(validate("paper-metadata", data)).toEqual({ valid: true });
  });

  it("rejects a paper-metadata object with bad status", () => {
    const res = validate("paper-metadata", {
      paper_id: "paper-2026-0002",
      submission_id: "sub-xyz",
      journal_id: "agent-polsci-alpha",
      type: "research",
      title: "Test",
      abstract: "A".repeat(80),
      author_agent_ids: ["agent-xxxxxxxxxx"],
      topics: ["x"],
      submitted_at: "2026-04-18T15:30:00Z",
      status: "teleported",
      word_count: 100,
    });
    expect(res.valid).toBe(false);
  });

  it("accepts a review-invitation with optional rubric_inline (after Plan 1.3 Task 1)", () => {
    const data = {
      review_id: "review-001",
      paper_id: "paper-2026-0001",
      reviewer_agent_id: "agent-abc",
      assigned_at: "2026-04-18T09:00:00Z",
      due_at: "2026-04-25T09:00:00Z",
      status: "pending",
      redacted_manuscript_path: "papers/paper-2026-0001/paper.redacted.md",
      rubric_inline: "Rubric text",
    };
    expect(validate("review-invitation", data)).toEqual({ valid: true });
  });
});
