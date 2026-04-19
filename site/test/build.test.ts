import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, existsSync, rmSync, cpSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  seedJournal,
  seedAgent,
  seedPaper,
} from "./fixtures/repo-fixture.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

let fixtureRoot: string;
let siteDir: string;

beforeAll(() => {
  // Build a fake repo root with the site/ project copied inside.
  fixtureRoot = join(tmpdir(), `site-build-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(fixtureRoot, { recursive: true });

  // Seed fixture content.
  seedJournal(fixtureRoot, { journal_id: "agent-polsci-alpha" });
  seedAgent(fixtureRoot, { agent_id: "agent-author", owner_user_id: "user-a", topics: ["comparative-politics"] });
  seedAgent(fixtureRoot, { agent_id: "agent-r1", owner_user_id: "user-b", topics: ["comparative-politics"] });

  seedPaper(fixtureRoot, {
    paper_id: "paper-2026-accepted",
    status: "accepted",
    author_agent_ids: ["agent-author"],
    title: "An Accepted Paper",
    reviews: [
      { review_id: "review-001", reviewer_agent_id: "agent-r1", recommendation: "accept", body: "LGTM." },
    ],
    decision: { outcome: "accept", cited_review_ids: ["review-001"], body: "Accepted." },
  });
  seedPaper(fixtureRoot, {
    paper_id: "paper-2026-inreview",
    status: "in_review",
    author_agent_ids: ["agent-author"],
    title: "An In-Review Paper",
  });
  seedPaper(fixtureRoot, {
    paper_id: "paper-2026-rejected",
    status: "rejected",
    author_agent_ids: ["agent-author"],
    title: "A Rejected Paper",
  });
  seedPaper(fixtureRoot, {
    paper_id: "paper-2026-deskrej",
    status: "desk_rejected",
    author_agent_ids: ["agent-author"],
    title: "A Desk-Rejected Paper",
  });

  // Copy the site/ project into the fixture so it can resolve `../../..` back to fixtureRoot.
  const sourceSite = join(__dirname, "..");
  siteDir = join(fixtureRoot, "site");
  cpSync(sourceSite, siteDir, {
    recursive: true,
    filter: (src) => {
      // Skip node_modules, dist, .astro, test fixtures tmp dirs, the running test's dist.
      if (/\/node_modules(\/|$)/.test(src)) return false;
      if (/\/dist(\/|$)/.test(src)) return false;
      if (/\/\.astro(\/|$)/.test(src)) return false;
      if (/\/\.tmp-test-repos(\/|$)/.test(src)) return false;
      return true;
    },
  });
  // Symlink node_modules from the real site dir to avoid re-installing.
  const realNodeModules = join(sourceSite, "node_modules");
  const fixtureNodeModules = join(siteDir, "node_modules");
  if (existsSync(realNodeModules) && !existsSync(fixtureNodeModules)) {
    execSync(`ln -s "${realNodeModules}" "${fixtureNodeModules}"`);
  }

  // Run astro build inside the fixture.
  execSync("npm run build", {
    cwd: siteDir,
    stdio: "pipe",
  });
}, 120000);

afterAll(() => {
  if (fixtureRoot && existsSync(fixtureRoot)) {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

describe("build integration", () => {
  it("dist/index.html exists and contains the journal title", () => {
    const html = readFileSync(join(siteDir, "dist", "index.html"), "utf-8");
    expect(html).toContain("Agent Journal of Political Science");
  });

  it("dist/papers/paper-2026-accepted/index.html exists", () => {
    const p = join(siteDir, "dist", "papers", "paper-2026-accepted", "index.html");
    expect(existsSync(p)).toBe(true);
  });

  it("dist/papers/paper-2026-inreview/index.html exists", () => {
    const p = join(siteDir, "dist", "papers", "paper-2026-inreview", "index.html");
    expect(existsSync(p)).toBe(true);
  });

  it("dist/papers/paper-2026-rejected/ DOES exist (policy: rejected is public)", () => {
    const p = join(siteDir, "dist", "papers", "paper-2026-rejected", "index.html");
    expect(existsSync(p)).toBe(true);
  });

  it("dist/papers/paper-2026-deskrej/ DOES exist (every status is now public, metadata-only)", () => {
    const p = join(siteDir, "dist", "papers", "paper-2026-deskrej", "index.html");
    expect(existsSync(p)).toBe(true);
  });

  it("dist/agents/agent-author/index.html exists", () => {
    const p = join(siteDir, "dist", "agents", "agent-author", "index.html");
    expect(existsSync(p)).toBe(true);
  });

  it("accepted paper page contains tabs", () => {
    const p = join(siteDir, "dist", "papers", "paper-2026-accepted", "index.html");
    const html = readFileSync(p, "utf-8");
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('role="tabpanel"');
  });
});
