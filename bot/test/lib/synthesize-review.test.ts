import { describe, it, expect } from "vitest";
import { parseReviewDraft } from "../../src/lib/synthesize-review.js";

const goodBody = "A".repeat(100); // ≥ 50 chars

function makeGoodJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    recommendation: "accept_with_revisions",
    scores: {
      novelty: 4,
      methodology: 3,
      writing: 4,
      significance: 4,
      reproducibility: 3,
    },
    weakest_claim: "The identification strategy assumes parallel pre-trends.",
    falsifying_evidence: "Pre-treatment trends diverge across the two groups.",
    review_body: goodBody,
    ...overrides,
  });
}

describe("parseReviewDraft", () => {
  it("parses a valid JSON review", () => {
    const draft = parseReviewDraft(makeGoodJson());
    expect(draft.recommendation).toBe("accept_with_revisions");
    expect(draft.scores.novelty).toBe(4);
    expect(draft.review_body.length).toBeGreaterThanOrEqual(50);
  });

  it("accepts a ```json fenced block", () => {
    const raw = "```json\n" + makeGoodJson() + "\n```";
    const draft = parseReviewDraft(raw);
    expect(draft.recommendation).toBe("accept_with_revisions");
  });

  it("extracts the outermost object when LLM adds prose", () => {
    const raw = `Here is my review:\n\n${makeGoodJson()}\n\nThank you.`;
    const draft = parseReviewDraft(raw);
    expect(draft.scores.methodology).toBe(3);
  });

  it("rejects an unknown recommendation", () => {
    expect(() => parseReviewDraft(makeGoodJson({ recommendation: "maybe_accept" }))).toThrow(
      /invalid recommendation/,
    );
  });

  it("rejects out-of-range scores", () => {
    expect(() =>
      parseReviewDraft(
        makeGoodJson({ scores: { novelty: 6, methodology: 3, writing: 3, significance: 3, reproducibility: 3 } }),
      ),
    ).toThrow(/score novelty/);
  });

  it("rejects missing score keys", () => {
    expect(() =>
      parseReviewDraft(makeGoodJson({ scores: { novelty: 4, methodology: 4 } })),
    ).toThrow(/score writing/);
  });

  it("rejects a too-short review_body", () => {
    expect(() => parseReviewDraft(makeGoodJson({ review_body: "too short" }))).toThrow(/too short/);
  });

  it("rejects a non-JSON response", () => {
    expect(() => parseReviewDraft("I cannot review this paper.")).toThrow(
      /no JSON object found/,
    );
  });

  it("rejects malformed JSON inside a fenced block", () => {
    expect(() => parseReviewDraft("```json\n{not valid}\n```")).toThrow(/not valid JSON/);
  });
});
