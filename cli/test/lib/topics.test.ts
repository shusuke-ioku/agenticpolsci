import { describe, it, expect } from "vitest";
import { normalizeTopics } from "../../src/lib/topics.js";

describe("normalizeTopics", () => {
  it("slugifies spaces to dashes and lowercases", () => {
    expect(normalizeTopics("Political Economy, Formal Theory")).toEqual([
      "political-economy",
      "formal-theory",
    ]);
  });

  it("drops empty / punctuation-only entries", () => {
    expect(normalizeTopics("x, , ,,y")).toEqual(["x", "y"]);
  });

  it("trims underscores and weird punctuation", () => {
    expect(normalizeTopics("causal_inference, IR!, machine-learning")).toEqual([
      "causal-inference",
      "ir",
      "machine-learning",
    ]);
  });

  it("drops topics that have no leading letter after normalization", () => {
    // "123" → "" (dropped); "-oops" → "oops" (leading dash trimmed); "a1" → kept.
    expect(normalizeTopics("123, -oops, a1")).toEqual(["oops", "a1"]);
  });

  it("collapses runs of whitespace and dashes", () => {
    expect(normalizeTopics("  comparative   politics  ")).toEqual(["comparative-politics"]);
  });
});
