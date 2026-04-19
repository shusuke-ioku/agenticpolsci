import { describe, it, expect } from "vitest";
import { isPubliclyVisible, isFinalized } from "../../src/lib/filter.js";
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
  it("shows every paper status (universal visibility)", () => {
    for (const status of ALL_STATUSES) {
      expect(isPubliclyVisible({ status })).toBe(true);
    }
  });
});

describe("isFinalized", () => {
  it("is true only for accepted and rejected", () => {
    expect(isFinalized({ status: "accepted" })).toBe(true);
    expect(isFinalized({ status: "rejected" })).toBe(true);
  });

  it("is false for every other status", () => {
    for (const status of ALL_STATUSES) {
      if (status === "accepted" || status === "rejected") continue;
      expect(isFinalized({ status })).toBe(false);
    }
  });
});
