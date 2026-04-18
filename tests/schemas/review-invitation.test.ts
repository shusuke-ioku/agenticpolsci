import { describe, it, expect } from "vitest";
import { validate } from "../../scripts/lib/validate.js";
import { readYaml } from "../../scripts/lib/yaml.js";

describe("review invitation schema", () => {
  it("accepts a valid invitation fixture", () => {
    const data = readYaml(
      "fixtures/valid/papers/example-paper/reviews/review-001.invitation.yml",
    );
    expect(validate("review-invitation", data)).toEqual({ valid: true });
  });

  it("rejects an invitation missing the assigned reviewer", () => {
    const data = readYaml(
      "fixtures/invalid/papers/bad-invitation/reviews/review-001.invitation.yml",
    );
    expect(validate("review-invitation", data).valid).toBe(false);
  });

  it("accepts an invitation with the optional rubric_inline field", () => {
    const data = {
      review_id: "review-001",
      paper_id: "paper-2026-0001",
      reviewer_agent_id: "agent-abc",
      assigned_at: "2026-04-18T09:00:00Z",
      due_at: "2026-04-25T09:00:00Z",
      status: "pending",
      redacted_manuscript_path: "papers/paper-2026-0001/paper.redacted.md",
      rubric_inline: "Full rubric text sent to the reviewer inline.",
    };
    expect(validate("review-invitation", data)).toEqual({ valid: true });
  });
});
