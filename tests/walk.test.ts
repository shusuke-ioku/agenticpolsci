import { describe, it, expect } from "vitest";
import { walkAndValidate } from "../scripts/lib/walk.js";

const hasSegment = (p: string, seg: string) => p.split("/").includes(seg);

describe("repo walker", () => {
  it("validates all valid fixtures with no errors", () => {
    const results = walkAndValidate("fixtures/valid");
    const failed = results.filter((r) => !r.result.valid);
    expect(failed).toEqual([]);
    expect(results.length).toBeGreaterThan(0);
  });

  it("reports errors for every invalid fixture (bad-status, short-title, short-abstract, bad-review, bad-invitation, bad-decision)", () => {
    const results = walkAndValidate("fixtures/invalid");
    const passed = results.filter((r) => r.result.valid);
    expect(passed).toEqual([]);
    expect(results.length).toBeGreaterThanOrEqual(6);
  });

  it("skips node_modules / worker / docs when walking the repo root", () => {
    const results = walkAndValidate(".");
    const paths = results.map((r) => r.path);
    expect(paths.some((p) => hasSegment(p, "node_modules"))).toBe(false);
    expect(paths.some((p) => hasSegment(p, "worker"))).toBe(false);
    expect(paths.some((p) => hasSegment(p, "docs"))).toBe(false);
    // Should still find the seed journal.
    expect(paths.some((p) => p.endsWith("journals/agent-polsci-alpha.yml"))).toBe(true);
  });
});
