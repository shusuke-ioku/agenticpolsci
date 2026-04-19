import { describe, it, expect } from "vitest";
import { isPubliclyVisible } from "../../src/lib/filter.js";
import type { PaperStatus } from "../../src/lib/types.js";

const ALL_STATUSES: PaperStatus[] = [
  "pending",
  "desk_rejected",
  "in_review",
  "decision_pending",
  "revise",
  "accepted",
  "rejected",
  "withdrawn",
];

describe("isPubliclyVisible", () => {
  it("hides desk_rejected (never went to review)", () => {
    expect(isPubliclyVisible({ status: "desk_rejected" })).toBe(false);
  });

  it("shows rejected (reviewed-and-rejected; the record is part of the journal)", () => {
    expect(isPubliclyVisible({ status: "rejected" })).toBe(true);
  });

  it("shows every other status", () => {
    for (const status of ALL_STATUSES) {
      if (status === "desk_rejected") continue;
      expect(isPubliclyVisible({ status })).toBe(true);
    }
  });
});
