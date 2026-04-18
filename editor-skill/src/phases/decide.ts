import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { writeMarkdownWithFrontmatter } from "../lib/yaml.js";
import { loadPolicy } from "../lib/policy.js";
import { buildWorkQueue } from "../lib/state.js";

export type Tier =
  | "replication_gate_fail"
  | "unanimous_reject"
  | "unanimous_accept"
  | "contested";

export type EvaluateTierInput = {
  publicRepoPath: string;
  policyRepoPath: string;
  paperId: string;
};

export type EvaluateTierResult = {
  tier: Tier;
  autoOutcome: "accept" | "reject" | null;
  recommendationSummary: Record<string, number>;
};

export async function evaluateTier(input: EvaluateTierInput): Promise<EvaluateTierResult> {
  const policy = loadPolicy(input.policyRepoPath);
  const q = buildWorkQueue(input.publicRepoPath);
  const paper = q.all_papers.find((p) => p.paper_id === input.paperId);
  if (!paper) throw new Error(`paper ${input.paperId} not found`);

  if (paper.type === "replication") {
    if (!paper.hasReproducibilityArtifact || paper.reproducibilitySuccess === false) {
      return { tier: "replication_gate_fail", autoOutcome: "reject", recommendationSummary: {} };
    }
  }

  const recs = paper.reviews.map((r) => r.recommendation);
  const summary: Record<string, number> = {};
  for (const r of recs) summary[r] = (summary[r] ?? 0) + 1;

  const rejects = summary["reject"] ?? 0;
  if (rejects >= policy.thresholds.tier_unanimous_reject_count) {
    return { tier: "unanimous_reject", autoOutcome: "reject", recommendationSummary: summary };
  }
  if (recs.length > 0 && recs.every((r) => r === "accept")) {
    return { tier: "unanimous_accept", autoOutcome: "accept", recommendationSummary: summary };
  }
  return { tier: "contested", autoOutcome: null, recommendationSummary: summary };
}

export type CitedReview = {
  review_id: string;
  accepted_concerns: string[];
  dismissed_concerns: string[];
};

export type CommitDecisionInput = {
  publicRepoPath: string;
  paperId: string;
  outcome: "accept" | "accept_with_revisions" | "major_revisions" | "reject" | "desk_reject";
  citedReviews: CitedReview[];
  prose: string;
  reviseWindowDays: number;
  editorAgentId?: string;
  subagentPrompt?: string;
  subagentResponse?: string;
  now?: Date;
};

export async function commitDecision(
  input: CommitDecisionInput,
): Promise<{ touchedPaths: string[]; commitMessage: string }> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const paperDir = join(input.publicRepoPath, "papers", input.paperId);
  const metaPath = join(paperDir, "metadata.yml");
  if (!existsSync(metaPath)) throw new Error(`metadata.yml missing for ${input.paperId}`);

  // Cross-check cited_reviews against existing review files.
  const reviewsDir = join(paperDir, "reviews");
  const existingReviewIds = existsSync(reviewsDir)
    ? readdirSync(reviewsDir)
        .filter((f) => /^review-\d{3,}\.md$/.test(f))
        .map((f) => f.replace(/\.md$/, ""))
    : [];
  for (const cr of input.citedReviews) {
    if (!existingReviewIds.includes(cr.review_id)) {
      throw new Error(`cited_reviews references missing review: ${cr.review_id}`);
    }
  }

  const frontmatter: Record<string, unknown> = {
    paper_id: input.paperId,
    editor_agent_id: input.editorAgentId ?? "editor-aps-001",
    decided_at: nowIso,
    outcome: input.outcome,
    cited_reviews: input.citedReviews,
    schema_version: 1,
  };
  if (input.outcome === "accept_with_revisions" || input.outcome === "major_revisions") {
    frontmatter.revisions_due_at = new Date(
      now.getTime() + input.reviseWindowDays * 86400000,
    ).toISOString();
  }

  const decisionPath = join(paperDir, "decision.md");
  writeMarkdownWithFrontmatter(decisionPath, frontmatter, input.prose);

  // Update metadata status.
  const statusMap: Record<string, string> = {
    accept: "accepted",
    accept_with_revisions: "revise",
    major_revisions: "revise",
    reject: "rejected",
    desk_reject: "desk_rejected",
  };
  const raw = readFileSync(metaPath, "utf-8");
  let newMeta = raw.replace(/^status:\s*.*$/m, `status: ${statusMap[input.outcome]}`);
  if (!/^decided_at:/m.test(newMeta))
    newMeta = newMeta.trimEnd() + `\ndecided_at: "${nowIso}"\n`;
  else newMeta = newMeta.replace(/^decided_at:.*$/m, `decided_at: "${nowIso}"`);
  writeFileSync(metaPath, newMeta);

  return {
    touchedPaths: [decisionPath, metaPath],
    commitMessage: `editor: decide ${input.paperId} → ${input.outcome}`,
  };
}
