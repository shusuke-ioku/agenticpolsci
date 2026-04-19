import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  seedJournal,
  seedAgent,
  seedPaper,
  seedIssue,
  cleanupTempDir,
} from "../fixtures/repo-fixture.js";
import {
  loadJournal,
  loadAllPapers,
  loadPaper,
  loadAllAgents,
  loadAgent,
  loadAllIssues,
  loadIssue,
} from "../../src/lib/load.js";

describe("load", () => {
  let root: string;

  beforeEach(() => {
    root = join(tmpdir(), `site-load-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(root, { recursive: true });
  });
  afterEach(() => cleanupTempDir(root));

  it("loadJournal reads the journal YAML", () => {
    seedJournal(root, { journal_id: "agent-polsci-alpha" });
    const j = loadJournal(root, "agent-polsci-alpha");
    expect(j.meta.journal_id).toBe("agent-polsci-alpha");
    expect(j.meta.title).toContain("Agent Journal");
  });

  it("loadAllPapers lists papers of every status (universal visibility)", () => {
    seedPaper(root, { paper_id: "paper-2026-0001", status: "accepted", author_agent_ids: ["agent-a"] });
    seedPaper(root, { paper_id: "paper-2026-0002", status: "in_review", author_agent_ids: ["agent-a"] });
    seedPaper(root, { paper_id: "paper-2026-0003", status: "rejected", author_agent_ids: ["agent-a"] });
    seedPaper(root, { paper_id: "paper-2026-0004", status: "desk_rejected", author_agent_ids: ["agent-a"] });
    const papers = loadAllPapers(root);
    const ids = papers.map((p) => p.meta.paper_id).sort();
    expect(ids).toEqual([
      "paper-2026-0001",
      "paper-2026-0002",
      "paper-2026-0003",
      "paper-2026-0004",
    ]);
  });

  it("loadPaper returns metadata-only for unfinalized papers (manuscript + reviews + decision hidden)", () => {
    seedPaper(root, {
      paper_id: "paper-2026-0005",
      status: "in_review",
      author_agent_ids: ["agent-a"],
      manuscript_body: "Secret draft content.",
      reviews: [
        { review_id: "review-001", reviewer_agent_id: "agent-r1", recommendation: "accept", body: "LGTM" },
      ],
    });
    const p = loadPaper(root, "paper-2026-0005");
    expect(p).not.toBeNull();
    if (!p) return;
    expect(p.meta.paper_id).toBe("paper-2026-0005");
    expect(p.manuscript_html).toBe("");
    expect(p.reviews).toEqual([]);
    expect(p.decision).toBeNull();
    expect(p.reproducibility).toBeNull();
  });

  it("loadPaper returns metadata-only for desk_rejected papers too", () => {
    seedPaper(root, {
      paper_id: "paper-2026-0006",
      status: "desk_rejected",
      author_agent_ids: ["agent-a"],
      manuscript_body: "Desk-rejected body.",
    });
    const p = loadPaper(root, "paper-2026-0006");
    expect(p).not.toBeNull();
    if (!p) return;
    expect(p.manuscript_html).toBe("");
    expect(p.reviews).toEqual([]);
    expect(p.decision).toBeNull();
  });

  it("loadPaper composes manuscript HTML + reviews + decision + reproducibility", () => {
    seedPaper(root, {
      paper_id: "paper-2026-0010",
      status: "accepted",
      author_agent_ids: ["agent-a"],
      manuscript_body: "First paragraph.\n\nSecond paragraph.",
      reviews: [
        { review_id: "review-001", reviewer_agent_id: "agent-r1", recommendation: "accept", body: "Great work." },
        { review_id: "review-002", reviewer_agent_id: "agent-r2", recommendation: "accept_with_revisions", body: "Minor fixes." },
      ],
      decision: {
        outcome: "accept_with_revisions",
        cited_review_ids: ["review-001", "review-002"],
        body: "I accept with revisions.",
        revisions_due_at: "2026-05-21T09:00:00Z",
      },
      reproducibility: { success: true, body: "Code runs." },
    });
    const p = loadPaper(root, "paper-2026-0010");
    expect(p).not.toBeNull();
    if (!p) return;
    expect(p.manuscript_html).toContain("<p>First paragraph.</p>");
    expect(p.manuscript_html).toContain("<p>Second paragraph.</p>");
    expect(p.reviews).toHaveLength(2);
    expect(p.reviews[0].frontmatter.review_id).toBe("review-001");
    expect(p.reviews[0].body_html).toContain("<p>Great work.</p>");
    expect(p.decision?.frontmatter.outcome).toBe("accept_with_revisions");
    expect(p.decision?.frontmatter.cited_reviews).toHaveLength(2);
    expect(p.decision?.body_html).toContain("<p>I accept with revisions.</p>");
    expect(p.reproducibility?.success).toBe(true);
  });

  it("loadAllAgents composes authored list across all statuses; reviewed list only shows finalized reviews", () => {
    seedAgent(root, { agent_id: "agent-author", owner_user_id: "user-a" });
    seedAgent(root, { agent_id: "agent-reviewer", owner_user_id: "user-b" });
    seedPaper(root, {
      paper_id: "paper-2026-0011",
      status: "accepted",
      author_agent_ids: ["agent-author"],
      reviews: [
        { review_id: "review-001", reviewer_agent_id: "agent-reviewer", recommendation: "accept" },
      ],
    });
    seedPaper(root, {
      paper_id: "paper-2026-0012",
      status: "desk_rejected",
      author_agent_ids: ["agent-author"],
      reviews: [
        { review_id: "review-001", reviewer_agent_id: "agent-reviewer", recommendation: "reject" },
      ],
    });
    const agents = loadAllAgents(root);
    const ag = agents.find((a) => a.profile.agent_id === "agent-author");
    const rv = agents.find((a) => a.profile.agent_id === "agent-reviewer");
    // Author sees both papers in their list (every paper is public).
    expect(ag?.authored.map((p) => p.meta.paper_id).sort()).toEqual([
      "paper-2026-0011",
      "paper-2026-0012",
    ]);
    // Reviewer list only surfaces reviews on finalized papers — the desk_rejected
    // paper's manuscript/reviews are still hidden.
    expect(rv?.reviewed.map((r) => r.paper.meta.paper_id)).toEqual(["paper-2026-0011"]);
  });

  it("loadAgent returns a single agent by id", () => {
    seedAgent(root, { agent_id: "agent-solo", owner_user_id: "user-s" });
    const a = loadAgent(root, "agent-solo");
    expect(a?.profile.agent_id).toBe("agent-solo");
    const missing = loadAgent(root, "agent-not-there");
    expect(missing).toBeNull();
  });

  it("loadAllIssues + loadIssue", () => {
    seedIssue(root, { issue_id: "2026-issue1", paper_ids: ["paper-2026-0001"] });
    const all = loadAllIssues(root);
    expect(all.map((i) => i.meta.issue_id)).toEqual(["2026-issue1"]);
    const one = loadIssue(root, "2026-issue1");
    expect(one?.meta.paper_ids).toEqual(["paper-2026-0001"]);
  });

  it("throws on malformed YAML", () => {
    // Seed an agent file with invalid YAML.
    const { writeFileSync, mkdirSync: mk } = require("node:fs") as typeof import("node:fs");
    mk(join(root, "agents"), { recursive: true });
    writeFileSync(join(root, "agents", "agent-bad.yml"), "::: not yaml :::\n");
    expect(() => loadAllAgents(root)).toThrow();
  });
});
