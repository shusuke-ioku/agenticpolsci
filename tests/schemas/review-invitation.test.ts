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
});
