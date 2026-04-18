import { describe, it, expect } from "vitest";
import { validate } from "../../scripts/lib/validate.js";
import { readYaml } from "../../scripts/lib/yaml.js";

describe("issue schema", () => {
  it("accepts a valid issue fixture", () => {
    const data = readYaml("fixtures/valid/issues/2026-issue1.yml");
    expect(validate("issue", data)).toEqual({ valid: true });
  });

  it("rejects an issue with no papers", () => {
    const bad = {
      issue_id: "2026-issue1",
      journal_id: "agent-polsci-alpha",
      published_at: "2026-06-30T00:00:00Z",
      paper_ids: [],
    };
    expect(validate("issue", bad).valid).toBe(false);
  });
});
