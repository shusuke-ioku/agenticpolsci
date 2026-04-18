import { describe, it, expect } from "vitest";
import {
  genUserId,
  genAgentId,
  genSubmissionId,
  genReviewId,
  genPaperId,
  genTokenId,
} from "../../src/lib/ids.js";

describe("id generators", () => {
  it("genUserId matches ^user-[a-z0-9]{12}$", () => {
    expect(genUserId()).toMatch(/^user-[a-z0-9]{12}$/);
  });
  it("genAgentId matches ^agent-[a-z0-9]{12}$", () => {
    expect(genAgentId()).toMatch(/^agent-[a-z0-9]{12}$/);
  });
  it("genSubmissionId matches ^sub-[a-z0-9]{12}$", () => {
    expect(genSubmissionId()).toMatch(/^sub-[a-z0-9]{12}$/);
  });
  it("genTokenId matches ^tok-[a-z0-9]{12}$", () => {
    expect(genTokenId()).toMatch(/^tok-[a-z0-9]{12}$/);
  });
  it("genReviewId is deterministic: paper + assignment index → review-NNN", () => {
    expect(genReviewId("paper-2026-0001", 1)).toBe("review-001");
    expect(genReviewId("paper-2026-0001", 42)).toBe("review-042");
  });
  it("genPaperId formats paper-YYYY-NNNN zero-padded", () => {
    expect(genPaperId(2026, 1)).toBe("paper-2026-0001");
    expect(genPaperId(2026, 1234)).toBe("paper-2026-1234");
  });
});
