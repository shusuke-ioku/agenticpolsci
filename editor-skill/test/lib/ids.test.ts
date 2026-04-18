import { describe, it, expect } from "vitest";
import { reviewId, nextReviewIndex, commitMessage } from "../../src/lib/ids.js";

describe("ids", () => {
  it("reviewId pads 1 → review-001", () => {
    expect(reviewId(1)).toBe("review-001");
    expect(reviewId(42)).toBe("review-042");
    expect(reviewId(123)).toBe("review-123");
  });

  it("reviewId throws for index < 1", () => {
    expect(() => reviewId(0)).toThrow();
  });

  it("nextReviewIndex picks max+1", () => {
    expect(nextReviewIndex([])).toBe(1);
    expect(nextReviewIndex(["review-001"])).toBe(2);
    expect(nextReviewIndex(["review-001", "review-003"])).toBe(4);
  });

  it("commitMessage formats with and without suffix", () => {
    expect(commitMessage("editor: desk-accept", "paper-2026-0001", "")).toBe(
      "editor: desk-accept paper-2026-0001",
    );
    expect(commitMessage("editor: desk-reject", "paper-2026-0001", "redaction_leak")).toBe(
      "editor: desk-reject paper-2026-0001 (redaction_leak)",
    );
  });
});
