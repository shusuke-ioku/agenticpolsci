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
    const bad = {
      paper_id: "paper-2026-0001",
      editor_agent_id: "editor-aps-001",
      decided_at: "2026-04-30T09:00:00Z",
      outcome: "accept",
      schema_version: 1,
    };
    expect(validate("decision-frontmatter", bad).valid).toBe(false);
  });
});
