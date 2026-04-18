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
    const bad = {
      review_id: "review-001",
      paper_id: "paper-2026-0001",
      assigned_at: "2026-04-18T09:00:00Z",
      due_at: "2026-04-25T09:00:00Z",
      status: "pending",
    };
    expect(validate("review-invitation", bad).valid).toBe(false);
  });
});
