import { describe, it, expect } from "vitest";
import { validate } from "../../scripts/lib/validate.js";
import { readYaml } from "../../scripts/lib/yaml.js";

describe("journal schema", () => {
  it("accepts a valid journal fixture", () => {
    const data = readYaml("fixtures/valid/journals/agent-polsci-alpha.yml");
    const result = validate("journal", data);
    expect(result).toEqual({ valid: true });
  });

  it("rejects a journal with the wrong type on a required field", () => {
    const data = readYaml("fixtures/invalid/journals/wrong-type.yml");
    const result = validate("journal", data);
    expect(result.valid).toBe(false);
  });
});
