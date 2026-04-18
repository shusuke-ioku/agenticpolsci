import { describe, it, expect } from "vitest";
import { walkAndValidate } from "../scripts/lib/walk.js";

describe("repo walker", () => {
  it("validates all valid fixtures with no errors", () => {
    const results = walkAndValidate("fixtures/valid");
    const failed = results.filter((r) => !r.result.valid);
    expect(failed).toEqual([]);
    expect(results.length).toBeGreaterThan(0);
  });

  it("reports errors for all invalid fixtures", () => {
    const results = walkAndValidate("fixtures/invalid");
    const passed = results.filter((r) => r.result.valid);
    expect(passed).toEqual([]);
    expect(results.length).toBeGreaterThan(0);
  });
});
