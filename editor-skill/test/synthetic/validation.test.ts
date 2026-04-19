import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  existsSync,
  rmSync,
  cpSync,
  readdirSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { runTick } from "../../src/tick.js";
import {
  loadExpectedOutcomes,
  seedSyntheticFixture,
  buildStub,
  injectReviewerReview,
} from "./helpers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..", "..");

let fixtureRoot: string;
let publicRepo: string;
let policyRepo: string;
let siteDir: string;

beforeAll(async () => {
  fixtureRoot = join(
    tmpdir(),
    `synth-validation-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(fixtureRoot, { recursive: true });
  publicRepo = join(fixtureRoot, "repo");
  policyRepo = join(fixtureRoot, "policy");
  mkdirSync(publicRepo, { recursive: true });

  // Seed.
  seedSyntheticFixture(publicRepo, policyRepo);

  // --- Tick 1: desk_review.
  const outcomes = loadExpectedOutcomes();
  const stub = buildStub(outcomes);
  await runTick({
    publicRepoPath: publicRepo,
    policyRepoPath: policyRepo,
    subagent: stub,
    seedForRandom: 42,
  });

  // --- Tick 2: dispatch runs for desk-accepted papers (1, 2, 3). No desk_review to do.
  await runTick({
    publicRepoPath: publicRepo,
    policyRepoPath: policyRepo,
    subagent: stub,
    seedForRandom: 42,
  });

  // --- Inject reviewer-authored reviews for each of papers 1, 2, 3.
  for (const pid of ["paper-2026-0001", "paper-2026-0002", "paper-2026-0003"]) {
    const invDir = join(publicRepo, "papers", pid, "reviews");
    const invs = readdirSync(invDir).filter((f) => f.endsWith(".invitation.yml")).sort();
    expect(invs.length).toBe(3);
    const recs = outcomes.papers[pid]!.reviewer_recommendations ?? [];
    for (let i = 0; i < invs.length; i++) {
      const reviewId = invs[i].replace(".invitation.yml", "");
      const raw = readFileSync(join(invDir, invs[i]), "utf-8");
      const reviewer = raw.match(/^reviewer_agent_id:\s*(\S+)/m)?.[1] ?? "agent-r1";
      injectReviewerReview(publicRepo, pid, reviewId, reviewer, recs[i] ?? "accept");
    }
  }

  // --- Tick 3: decide. All tiered-auto (unanimous_accept / unanimous_accept / replication_gate_fail).
  await runTick({
    publicRepoPath: publicRepo,
    policyRepoPath: policyRepo,
    subagent: stub,
    seedForRandom: 42,
  });

  // --- Site build.
  // Copy the site/ project into the fixture so its ../../.. resolves to fixtureRoot/repo.
  const sourceSite = join(PROJECT_ROOT, "site");
  siteDir = join(publicRepo, "site");
  cpSync(sourceSite, siteDir, {
    recursive: true,
    filter: (src) => {
      if (/\/node_modules(\/|$)/.test(src)) return false;
      if (/\/dist(\/|$)/.test(src)) return false;
      if (/\/\.astro(\/|$)/.test(src)) return false;
      return true;
    },
  });
  const realNodeModules = join(sourceSite, "node_modules");
  const fixtureNodeModules = join(siteDir, "node_modules");
  if (existsSync(realNodeModules) && !existsSync(fixtureNodeModules)) {
    execSync(`ln -s "${realNodeModules}" "${fixtureNodeModules}"`);
  }
  execSync("npm run build", { cwd: siteDir, stdio: "pipe" });
}, 180000);

afterAll(() => {
  if (fixtureRoot && existsSync(fixtureRoot)) {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

describe("synthetic-submission validation — plumbing", () => {
  it("paper-2026-0001 status is accepted", () => {
    const meta = readFileSync(
      join(publicRepo, "papers", "paper-2026-0001", "metadata.yml"),
      "utf-8",
    );
    expect(meta).toMatch(/status: accepted/);
  });

  it("paper-2026-0002 status is accepted", () => {
    const meta = readFileSync(
      join(publicRepo, "papers", "paper-2026-0002", "metadata.yml"),
      "utf-8",
    );
    expect(meta).toMatch(/status: accepted/);
  });

  it("paper-2026-0003 status is rejected via replication gate", () => {
    const meta = readFileSync(
      join(publicRepo, "papers", "paper-2026-0003", "metadata.yml"),
      "utf-8",
    );
    expect(meta).toMatch(/status: rejected/);
    const decision = readFileSync(
      join(publicRepo, "papers", "paper-2026-0003", "decision.md"),
      "utf-8",
    );
    expect(decision).toContain("outcome: reject");
  });

  it("paper-2026-0004 status is desk_rejected with below_quality_floor", () => {
    const meta = readFileSync(
      join(publicRepo, "papers", "paper-2026-0004", "metadata.yml"),
      "utf-8",
    );
    expect(meta).toMatch(/status: desk_rejected/);
    expect(meta).toMatch(/desk_reject_reason_tag: below_quality_floor/);
  });

  it("paper-2026-0005 status is desk_rejected with prompt_injection", () => {
    const meta = readFileSync(
      join(publicRepo, "papers", "paper-2026-0005", "metadata.yml"),
      "utf-8",
    );
    expect(meta).toMatch(/status: desk_rejected/);
    expect(meta).toMatch(/desk_reject_reason_tag: prompt_injection/);
  });

  it("site build generates pages for all non-desk-rejected papers (including rejected-after-review)", () => {
    // Visible: accepted (0001, 0002) and rejected-after-review (0003).
    expect(existsSync(join(siteDir, "dist", "papers", "paper-2026-0001", "index.html"))).toBe(true);
    expect(existsSync(join(siteDir, "dist", "papers", "paper-2026-0002", "index.html"))).toBe(true);
    expect(existsSync(join(siteDir, "dist", "papers", "paper-2026-0003", "index.html"))).toBe(true);
    // Hidden: desk_rejected (0004, 0005).
    expect(existsSync(join(siteDir, "dist", "papers", "paper-2026-0004", "index.html"))).toBe(false);
    expect(existsSync(join(siteDir, "dist", "papers", "paper-2026-0005", "index.html"))).toBe(false);
  });

  it("home page lists the 3 visible papers (accepted + accepted + rejected) and not the desk-rejected pair", () => {
    const html = readFileSync(join(siteDir, "dist", "index.html"), "utf-8");
    expect(html).toContain("paper-2026-0001");
    expect(html).toContain("paper-2026-0002");
    expect(html).toContain("paper-2026-0003");
    expect(html).not.toContain("paper-2026-0004");
    expect(html).not.toContain("paper-2026-0005");
  });
});
