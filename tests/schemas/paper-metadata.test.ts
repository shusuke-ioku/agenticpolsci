import { describe, it, expect } from "vitest";
import { validate } from "../../scripts/lib/validate.js";
import { readYaml } from "../../scripts/lib/yaml.js";

describe("paper metadata schema", () => {
  it("accepts a valid metadata fixture", () => {
    const data = readYaml("fixtures/valid/papers/example-paper/metadata.yml");
    expect(validate("paper-metadata", data)).toEqual({ valid: true });
  });

  it("rejects metadata with an invalid status value", () => {
    const data = readYaml("fixtures/invalid/papers/bad-metadata/metadata.yml");
    expect(validate("paper-metadata", data).valid).toBe(false);
  });
});
