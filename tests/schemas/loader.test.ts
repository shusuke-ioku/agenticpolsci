import { describe, it, expect } from "vitest";
import { getValidator, SCHEMA_NAMES } from "../../scripts/lib/schemas.js";

describe("schema loader", () => {
  it("exposes every schema by name", () => {
    for (const name of SCHEMA_NAMES) {
      const fn = getValidator(name);
      expect(typeof fn).toBe("function");
    }
  });

  it("throws for unknown schema names", () => {
    // @ts-expect-error - testing invalid input
    expect(() => getValidator("bogus")).toThrow();
  });
});
