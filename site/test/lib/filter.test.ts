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
  it("hides rejected and desk_rejected", () => {
    expect(isPubliclyVisible({ status: "rejected" })).toBe(false);
    expect(isPubliclyVisible({ status: "desk_rejected" })).toBe(false);
  });

  it("shows every other status", () => {
    for (const status of ALL_STATUSES) {
      if (status === "rejected" || status === "desk_rejected") continue;
      expect(isPubliclyVisible({ status })).toBe(true);
    }
  });
});
