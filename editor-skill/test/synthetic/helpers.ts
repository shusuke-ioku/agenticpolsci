import { readFileSync, cpSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import type { SubagentStub } from "../../src/tick.js";
import type { DeskReviewReasonTag } from "../../src/phases/desk_review.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const SYNTHETIC_FIXTURES_DIR = join(__dirname, "fixtures");

export type ExpectedOutcome = {
  desk_review: "accept_for_review" | "desk_reject";
  desk_reject_reason_tag?: DeskReviewReasonTag;
  reviewer_recommendations?: Array<"accept" | "accept_with_revisions" | "major_revisions" | "reject">;
  expected_status: "accepted" | "rejected" | "desk_rejected";
  expected_tier?: "unanimous_accept" | "unanimous_reject" | "replication_gate_fail" | "contested";
};

export type ExpectedOutcomes = {
  papers: Record<string, ExpectedOutcome>;
};

export function loadExpectedOutcomes(): ExpectedOutcomes {
  const raw = readFileSync(join(SYNTHETIC_FIXTURES_DIR, "expected-outcomes.yml"), "utf-8");
  return yaml.load(raw, { schema: yaml.JSON_SCHEMA }) as ExpectedOutcomes;
}

/** Copy fixtures/policy and fixtures/papers into a given destination repo root. */
export function seedSyntheticFixture(destinationPublicRepo: string, destinationPolicyRepo: string): void {
  // Policy repo: copy the whole policy/ directory.
  mkdirSync(destinationPolicyRepo, { recursive: true });
  cpSync(join(SYNTHETIC_FIXTURES_DIR, "policy"), destinationPolicyRepo, { recursive: true });

  // Public repo: seed journal + agents + papers.
  mkdirSync(join(destinationPublicRepo, "journals"), { recursive: true });
  mkdirSync(join(destinationPublicRepo, "agents"), { recursive: true });
  mkdirSync(join(destinationPublicRepo, "papers"), { recursive: true });
  cpSync(join(SYNTHETIC_FIXTURES_DIR, "papers"), join(destinationPublicRepo, "papers"), {
    recursive: true,
  });

  // Seed journal inline.
  const journal = [
    "journal_id: agent-polsci-alpha",
    "title: Agent Journal of Political Science",
    "established: 2026-04-17",
    "editor_agent_id: editor-aps-001",
    "scope: |",
    "  Peer-reviewed venue for AI-authored political science research.",
    "submission_fee_cents: 100",
    "status: active",
  ].join("\n");
  writeFileSync(
    join(destinationPublicRepo, "journals", "agent-polsci-alpha.yml"),
    journal + "\n",
  );

  // Seed author + 3 reviewers.
  const agents = [
    { id: "agent-author01", owner: "user-author" },
    { id: "agent-r1", owner: "user-r1" },
    { id: "agent-r2", owner: "user-r2" },
    { id: "agent-r3", owner: "user-r3" },
  ];
  for (const a of agents) {
    const body = [
      `agent_id: ${a.id}`,
      `owner_user_id: ${a.owner}`,
      `display_name: ${a.id}`,
      `registered_at: "2026-04-01T00:00:00Z"`,
      "topics:",
      "  - comparative-politics",
      "  - electoral-systems",
      "  - replication",
      "  - political-economy",
      "  - institutional-performance",
      "  - voter-turnout",
      "  - misc",
      `review_opt_in: ${a.id === "agent-author01" ? "false" : "true"}`,
      "stats:",
      "  submissions: 0",
      "  acceptances: 0",
      "  reviews_completed: 0",
      "  reviews_timed_out: 0",
      "status: active",
    ].join("\n");
    writeFileSync(
      join(destinationPublicRepo, "agents", `${a.id}.yml`),
      body + "\n",
    );
  }
}

/** Build a SubagentStub that answers from expected-outcomes.yml for desk_review, throws for others. */
export function buildStub(outcomes: ExpectedOutcomes): SubagentStub {
  return {
    deskReview: async (paperId: string) => {
      const e = outcomes.papers[paperId];
      if (!e) throw new Error(`no expected outcome for paper ${paperId}`);
      return {
        outcome: e.desk_review,
        reason_tag: e.desk_reject_reason_tag ?? null,
        prose:
          e.desk_review === "accept_for_review"
            ? "Synthetic stub: accepting for review per expected-outcomes.yml."
            : `Synthetic stub: desk-rejecting for ${e.desk_reject_reason_tag}.`,
        prompt: "stub-prompt",
        response: "stub-response",
      };
    },
    decide: async () => {
      // No contested decisions in the synthetic fixture — every paper decides via tiered rules.
      throw new Error("decide subagent should not run on synthetic fixture (all decisions are tiered-auto)");
    },
    reserveReview: async () => {
      throw new Error("reserve review subagent should not run on synthetic fixture (3 external reviewers seeded)");
    },
  };
}

/** Write a reviewer-authored review markdown file at papers/<paper_id>/reviews/<review_id>.md. */
export function injectReviewerReview(
  publicRepoPath: string,
  paperId: string,
  reviewId: string,
  reviewerAgentId: string,
  recommendation: "accept" | "accept_with_revisions" | "major_revisions" | "reject",
): void {
  const fm = [
    "---",
    `review_id: ${reviewId}`,
    `paper_id: ${paperId}`,
    `reviewer_agent_id: ${reviewerAgentId}`,
    `submitted_at: "2026-04-24T11:00:00Z"`,
    `recommendation: ${recommendation}`,
    "scores:",
    "  novelty: 4",
    "  methodology: 4",
    "  writing: 4",
    "  significance: 4",
    "  reproducibility: 4",
    `weakest_claim: "Synthetic: generated review for plumbing validation."`,
    `falsifying_evidence: "Synthetic: generated review for plumbing validation."`,
    "schema_version: 1",
    "---",
    "",
    "Synthetic reviewer review body for plumbing validation.",
  ].join("\n");
  const path = join(publicRepoPath, "papers", paperId, "reviews", `${reviewId}.md`);
  writeFileSync(path, fm + "\n");
  // Flip the matching invitation file to submitted.
  const invPath = join(publicRepoPath, "papers", paperId, "reviews", `${reviewId}.invitation.yml`);
  const raw = readFileSync(invPath, "utf-8");
  writeFileSync(invPath, raw.replace(/^status:\s*.*$/m, "status: submitted"));
}
