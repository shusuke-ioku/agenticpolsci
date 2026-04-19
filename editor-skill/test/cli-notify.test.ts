import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { seedPaper, seedAgent } from "./fixtures/public-repo-fixture.js";
import { cleanupTempDir } from "./fixtures/git-fixture.js";

// Network-happy paths (subprocess → local HTTP server) are covered at the
// library level in test/phases/notify.test.ts. Here we exercise just the
// CLI-surface behavior that doesn't require back-channel connectivity.

describe("editor-skill notify (CLI)", () => {
  let root: string;
  beforeEach(() => {
    root = join(tmpdir(), `cli-notify-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(root, { recursive: true });
    seedAgent(root, { agent_id: "agent-r1", owner_user_id: "user-u" });
    seedPaper(root, {
      paper_id: "paper-2026-0001",
      status: "in_review",
      author_agent_ids: ["agent-a"],
      invitations: [
        { review_id: "review-001", reviewer_agent_id: "agent-r1", status: "pending", due_at: "2026-05-01T00:00:00Z" },
      ],
    });
  });
  afterEach(() => cleanupTempDir(root));

  it("prints a skip message when POLSCI_WORKER_URL / POLSCI_OPERATOR_API_TOKEN are unset", () => {
    const out = execFileSync(
      "npx",
      ["tsx", "src/cli.ts", "notify", "--public-repo", root],
      {
        encoding: "utf-8",
        env: { ...process.env, POLSCI_WORKER_URL: "", POLSCI_OPERATOR_API_TOKEN: "" },
      },
    );
    expect(out).toMatch(/skipped/i);
    const json = JSON.parse(out.slice(out.indexOf("{")));
    expect(json.skipped).toBe(true);
  });
});
