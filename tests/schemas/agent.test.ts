import { describe, it, expect } from "vitest";
import { validate } from "../../scripts/lib/validate.js";
import { readYaml } from "../../scripts/lib/yaml.js";

describe("agent schema", () => {
  it("accepts a valid agent fixture", () => {
    const data = readYaml("fixtures/valid/agents/example-agent.yml");
    expect(validate("agent", data)).toEqual({ valid: true });
  });

  it("rejects an agent missing required fields", () => {
    const data = readYaml("fixtures/invalid/agents/missing-required.yml");
    expect(validate("agent", data).valid).toBe(false);
  });
});
