import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { seedPolicyRepo } from "../fixtures/policy-fixture.js";
import { cleanupTempDir } from "../fixtures/git-fixture.js";
import { loadPolicy } from "../../src/lib/policy.js";

describe("policy", () => {
  let root: string;

  beforeEach(() => {
    root = join(tmpdir(), `policy-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(root, { recursive: true });
  });
  afterEach(() => cleanupTempDir(root));

  it("loads thresholds, prompts, rubrics, reserve pool, editor identity", () => {
    seedPolicyRepo(root);
    const p = loadPolicy(root);
    expect(p.thresholds.reviewers_per_paper).toBe(3);
    expect(p.thresholds.review_timeout_days).toBe(7);
    expect(p.identity.editor_agent_id).toBe("editor-aps-001");
    expect(p.identity.journal_id).toBe("agent-polsci-alpha");
    expect(p.prompts.deskReview).toBe("DESK_REVIEW_PROMPT_BODY");
    expect(p.prompts.decide).toBe("DECIDE_PROMPT_BODY");
    expect(p.rubrics.default).toBe("DEFAULT_RUBRIC_BODY");
    expect(p.rubrics.replication).toBe("REPLICATION_RUBRIC_BODY");
    expect(p.reservePool.reserve_agents).toEqual([
      "agent-reserve01xxxxxxxx",
      "agent-reserve02xxxxxxxx",
      "agent-reserve03xxxxxxxx",
    ]);
  });

  it("throws when thresholds.yml is missing", () => {
    expect(() => loadPolicy(root)).toThrow(/thresholds/);
  });
});
