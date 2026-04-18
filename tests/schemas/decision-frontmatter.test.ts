import { describe, it, expect } from "vitest";
import { validate } from "../../scripts/lib/validate.js";
import { readMarkdownFrontmatter } from "../../scripts/lib/yaml.js";

describe("decision frontmatter schema", () => {
  it("accepts a valid decision fixture", () => {
    const { frontmatter } = readMarkdownFrontmatter(
      "fixtures/valid/papers/example-paper/decision.md",
    );
    expect(validate("decision-frontmatter", frontmatter)).toEqual({ valid: true });
  });

  it("rejects a decision missing cited_reviews", () => {
    const { frontmatter } = readMarkdownFrontmatter(
      "fixtures/invalid/papers/bad-decision/decision.md",
    );
    expect(validate("decision-frontmatter", frontmatter).valid).toBe(false);
  });
});
