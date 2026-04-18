import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { seedPaper } from "../fixtures/public-repo-fixture.js";
import { cleanupTempDir } from "../fixtures/git-fixture.js";
import { commitDeskReview } from "../../src/phases/desk_review.js";

describe("desk_review", () => {
  let root: string;
  beforeEach(() => {
    root = join(tmpdir(), `desk-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(root, { recursive: true });
  });
  afterEach(() => cleanupTempDir(root));

  it("accept_for_review sets desk_reviewed_at and does NOT write decision.md", async () => {
    seedPaper(root, {
      paper_id: "paper-2026-0001",
      status: "pending",
      author_agent_ids: ["agent-author"],
    });
    const result = await commitDeskReview({
      publicRepoPath: root,
      paperId: "paper-2026-0001",
      outcome: "accept_for_review",
      reasonTag: null,
      prose: "Looks in scope; quality floor met.",
      subagentPrompt: "PROMPT",
      subagentResponse: "RESPONSE",
    });
    expect(result.touchedPaths).toContain(
      `${root}/papers/paper-2026-0001/metadata.yml`,
    );
    const meta = readFileSync(join(root, "papers/paper-2026-0001/metadata.yml"), "utf-8");
    expect(meta).toMatch(/desk_reviewed_at:/);
    expect(meta).toMatch(/status: pending/);
    expect(existsSync(join(root, "papers/paper-2026-0001/decision.md"))).toBe(false);
    const audits = existsSync(join(root, "papers/paper-2026-0001/audit"));
    expect(audits).toBe(true);
  });

  it("desk_reject flips status and writes decision.md + audit", async () => {
    seedPaper(root, {
      paper_id: "paper-2026-0002",
      status: "pending",
      author_agent_ids: ["agent-author"],
    });
    const result = await commitDeskReview({
      publicRepoPath: root,
      paperId: "paper-2026-0002",
      outcome: "desk_reject",
      reasonTag: "redaction_leak",
      prose: "Author name visible in §3.2.",
      subagentPrompt: "PROMPT",
      subagentResponse: "RESPONSE",
    });
    const meta = readFileSync(join(root, "papers/paper-2026-0002/metadata.yml"), "utf-8");
    expect(meta).toMatch(/status: desk_rejected/);
    expect(meta).toMatch(/desk_reject_reason_tag: redaction_leak/);
    const decision = readFileSync(join(root, "papers/paper-2026-0002/decision.md"), "utf-8");
    expect(decision).toMatch(/^---/);
    expect(decision).toMatch(/outcome: desk_reject/);
    expect(decision).toMatch(/Author name visible in §3\.2/);
    expect(result.touchedPaths.some((p) => p.includes("/audit/"))).toBe(true);
  });

  it("rejects invalid reason_tag on desk_reject", async () => {
    seedPaper(root, {
      paper_id: "paper-2026-0003",
      status: "pending",
      author_agent_ids: ["agent-author"],
    });
    await expect(
      commitDeskReview({
        publicRepoPath: root,
        paperId: "paper-2026-0003",
        outcome: "desk_reject",
        reasonTag: "not-a-real-tag" as any,
        prose: "body",
        subagentPrompt: "PROMPT",
        subagentResponse: "RESPONSE",
      }),
    ).rejects.toThrow(/reason_tag/);
  });
});
