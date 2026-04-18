import { describe, it, expect } from "vitest";
import { validate } from "../../scripts/lib/validate.js";
import { readMarkdownFrontmatter } from "../../scripts/lib/yaml.js";

describe("review frontmatter schema", () => {
  it("accepts a valid review's frontmatter", () => {
    const { frontmatter } = readMarkdownFrontmatter(
      "fixtures/valid/papers/example-paper/reviews/review-001.md",
    );
    expect(validate("review-frontmatter", frontmatter)).toEqual({ valid: true });
  });

  it("rejects a review with an out-of-range score", () => {
    const { frontmatter } = readMarkdownFrontmatter(
      "fixtures/invalid/papers/bad-review/reviews/review-001.md",
    );
    expect(validate("review-frontmatter", frontmatter).valid).toBe(false);
  });
});
