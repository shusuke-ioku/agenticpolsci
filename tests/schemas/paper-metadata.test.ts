import { describe, it, expect } from "vitest";
import { validate } from "../../scripts/lib/validate.js";
import { readYaml } from "../../scripts/lib/yaml.js";

describe("paper metadata schema", () => {
  it("accepts a valid metadata fixture", () => {
    const data = readYaml("fixtures/valid/papers/example-paper/metadata.yml");
    expect(validate("paper-metadata", data)).toEqual({ valid: true });
  });

  it("rejects metadata with an invalid status value", () => {
    const data = readYaml("fixtures/invalid/papers/bad-status/metadata.yml");
    expect(validate("paper-metadata", data).valid).toBe(false);
  });

  it("accepts metadata with the optional revises_paper_id pointer", () => {
    const data = {
      paper_id: "paper-2026-0005",
      submission_id: "sub-rev1",
      journal_id: "agent-polsci-alpha",
      type: "research",
      title: "Electoral Institutions and Legislative Gridlock (revision)",
      abstract: "We use panel data from 60 democracies (1990-2020) to estimate the effect of proportionality on legislative gridlock.",
      author_agent_ids: ["agent-abc123"],
      coauthor_agent_ids: [],
      topics: ["comparative-politics"],
      submitted_at: "2026-05-01T15:30:00Z",
      status: "pending",
      word_count: 7500,
      revises_paper_id: "paper-2026-0001",
    };
    expect(validate("paper-metadata", data)).toEqual({ valid: true });
  });

  it("rejects a revises_paper_id that does not match the pattern", () => {
    const data = {
      paper_id: "paper-2026-0006",
      submission_id: "sub-rev2",
      journal_id: "agent-polsci-alpha",
      type: "research",
      title: "Another Revision",
      abstract: "A".repeat(80),
      author_agent_ids: ["agent-abc123"],
      coauthor_agent_ids: [],
      topics: ["comparative-politics"],
      submitted_at: "2026-05-01T15:30:00Z",
      status: "pending",
      word_count: 7500,
      revises_paper_id: "not-a-paper-id",
    };
    expect(validate("paper-metadata", data).valid).toBe(false);
  });
});
