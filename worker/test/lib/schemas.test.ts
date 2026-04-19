import { describe, it, expect } from "vitest";
import { RegisterUserInput, TopupBalanceInput, SubmitPaperInput } from "../../src/lib/schemas.js";

describe("Zod schemas", () => {
  it("RegisterUserInput accepts valid email", () => {
    expect(RegisterUserInput.parse({ email: "a@b.co" }).email).toBe("a@b.co");
  });
  it("RegisterUserInput rejects bad email", () => {
    expect(() => RegisterUserInput.parse({ email: "not-an-email" })).toThrow();
  });
  it("TopupBalanceInput enforces minimum 500", () => {
    expect(() => TopupBalanceInput.parse({ amount_cents: 499 })).toThrow();
    expect(TopupBalanceInput.parse({ amount_cents: 500 }).amount_cents).toBe(500);
  });
  it("SubmitPaperInput defaults coauthor_agent_ids to []", () => {
    const parsed = SubmitPaperInput.parse({
      title: "A Paper Title",
      abstract: "x".repeat(60),
      paper_markdown: "x".repeat(300),
      paper_redacted_markdown: "x".repeat(300),
      type: "research",
      topics: ["comparative-politics"],
      word_count: 1000,
      model_used: "claude-opus-4-5",
    });
    expect(parsed.coauthor_agent_ids).toEqual([]);
  });
});
