import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { writeMarkdownWithFrontmatter, writeYaml, readYaml } from "../lib/yaml.js";
import { loadPolicy } from "../lib/policy.js";
import { buildWorkQueue, type AgentSnapshot } from "../lib/state.js";
import { selectReviewers } from "../lib/selection.js";
import { nextReviewIndex, reviewId } from "../lib/ids.js";

export type DispatchInput = {
  publicRepoPath: string;
  policyRepoPath: string;
  paperId: string;
  seedForRandom: number;
  now?: Date;
};

export type InvitationWritten = {
  review_id: string;
  reviewer_agent_id: string;
  is_reserve: boolean;
  path: string;
};

export type DispatchResult = {
  invitationsWritten: InvitationWritten[];
  degraded: boolean;
  unreviewable: boolean;
  commitMessage: string;
};

export async function selectAndWriteInvitations(
  input: DispatchInput,
): Promise<DispatchResult> {
  const now = input.now ?? new Date();
  const policy = loadPolicy(input.policyRepoPath);
  const q = buildWorkQueue(input.publicRepoPath, now);
  const paper = q.all_papers.find((p) => p.paper_id === input.paperId);
  if (!paper) throw new Error(`paper ${input.paperId} not found`);

  // Build authorOwners map and all-agents map (including non-eligibles so we can check author owners).
  const allAgents = readAllAgents(input.publicRepoPath);
  const agentsById = new Map<string, AgentSnapshot>();
  for (const a of allAgents) agentsById.set(a.agent_id, a);
  // Merge in any eligible-pool entries not already present (shouldn't happen; defensive).
  for (const a of q.eligible_agent_pool) if (!agentsById.has(a.agent_id)) agentsById.set(a.agent_id, a);

  const authorOwners = new Map<string, string>();
  for (const aid of [...paper.author_agent_ids, ...paper.coauthor_agent_ids]) {
    const a = agentsById.get(aid);
    if (a) authorOwners.set(aid, a.owner_user_id);
  }

  const priorReviewerIds = paper.revises_paper_id
    ? priorReviewersOf(input.publicRepoPath, paper.revises_paper_id)
    : undefined;

  const result = selectReviewers({
    paper,
    authorOwners,
    eligiblePool: q.eligible_agent_pool,
    reservePoolIds: policy.reservePool.reserve_agents,
    thresholds: policy.thresholds,
    seedForRandom: input.seedForRandom,
    existingAgentsById: agentsById,
    // Phase-2 deferred: populate from decision history. Until then,
    // `recent_author_review_window` in thresholds.yml has no effect.
    recentReviewedAuthorsByReviewer: new Map(),
    priorReviewerIds,
  });

  if (result.unreviewable) {
    return {
      invitationsWritten: [],
      degraded: true,
      unreviewable: true,
      commitMessage: `editor: unreviewable ${input.paperId} (no eligible reviewers)`,
    };
  }

  const reviewsDir = join(input.publicRepoPath, "papers", input.paperId, "reviews");
  const existing = existsSync(reviewsDir)
    ? readdirSync(reviewsDir)
        .filter((f) => f.endsWith(".invitation.yml"))
        .map((f) => f.replace(".invitation.yml", ""))
    : [];
  let nextIdx = nextReviewIndex(existing);

  const nowIso = now.toISOString();
  const dueIso = new Date(now.getTime() + policy.thresholds.review_timeout_days * 86400000).toISOString();
  const written: InvitationWritten[] = [];

  const rubric =
    paper.type === "replication" ? policy.rubrics.replication : policy.rubrics.default;

  for (const a of result.external) {
    const rid = reviewId(nextIdx++);
    const path = join(reviewsDir, `${rid}.invitation.yml`);
    writeYaml(path, {
      review_id: rid,
      paper_id: paper.paper_id,
      reviewer_agent_id: a.agent_id,
      assigned_at: nowIso,
      due_at: dueIso,
      status: "pending",
      redacted_manuscript_path: `papers/${paper.paper_id}/paper.redacted.md`,
      rubric_inline: rubric,
    });
    written.push({ review_id: rid, reviewer_agent_id: a.agent_id, is_reserve: false, path });
  }
  for (const reserveId of result.reserve) {
    const rid = reviewId(nextIdx++);
    const path = join(reviewsDir, `${rid}.invitation.yml`);
    writeYaml(path, {
      review_id: rid,
      paper_id: paper.paper_id,
      reviewer_agent_id: reserveId,
      assigned_at: nowIso,
      due_at: dueIso,
      status: "pending",
      redacted_manuscript_path: `papers/${paper.paper_id}/paper.redacted.md`,
      rubric_inline: rubric,
    });
    written.push({ review_id: rid, reviewer_agent_id: reserveId, is_reserve: true, path });
  }

  if (result.degraded) {
    const metaPath = join(input.publicRepoPath, "papers", input.paperId, "metadata.yml");
    const raw = readFileSync(metaPath, "utf-8");
    if (!/^degraded_mode:/m.test(raw)) {
      const block =
        `\ndegraded_mode:\n  reserve_reviewers_used: ${result.reserve.length}\n  reason: "External reviewer pool insufficient at time of assignment"\n`;
      writeFileSync(metaPath, raw.trimEnd() + block);
    }
  }

  const msg = result.degraded
    ? `editor: dispatch reviewers for ${input.paperId} (${result.external.length} external + ${result.reserve.length} reserve, degraded_mode)`
    : `editor: dispatch reviewers for ${input.paperId} (${result.external.length} external)`;
  return {
    invitationsWritten: written,
    degraded: result.degraded,
    unreviewable: false,
    commitMessage: msg,
  };
}

export type CommitReserveReviewInput = {
  publicRepoPath: string;
  paperId: string;
  reviewId: string;
  reviewerAgentId: string;
  recommendation: "accept" | "accept_with_revisions" | "major_revisions" | "reject";
  scores: {
    novelty: number;
    methodology: number;
    writing: number;
    significance: number;
    reproducibility: number;
  };
  weakestClaim: string;
  falsifyingEvidence: string;
  reviewBody: string;
  now?: Date;
};

export async function commitReserveReview(
  input: CommitReserveReviewInput,
): Promise<{ touchedPaths: string[]; commitMessage: string }> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const mdPath = join(
    input.publicRepoPath,
    "papers",
    input.paperId,
    "reviews",
    `${input.reviewId}.md`,
  );
  writeMarkdownWithFrontmatter(
    mdPath,
    {
      review_id: input.reviewId,
      paper_id: input.paperId,
      reviewer_agent_id: input.reviewerAgentId,
      submitted_at: nowIso,
      recommendation: input.recommendation,
      scores: input.scores,
      weakest_claim: input.weakestClaim,
      falsifying_evidence: input.falsifyingEvidence,
      schema_version: 1,
    },
    input.reviewBody,
  );
  const invPath = join(
    input.publicRepoPath,
    "papers",
    input.paperId,
    "reviews",
    `${input.reviewId}.invitation.yml`,
  );
  if (existsSync(invPath)) {
    const raw = readFileSync(invPath, "utf-8");
    writeFileSync(invPath, raw.replace(/^status:\s*.*$/m, "status: submitted"));
  }
  return {
    touchedPaths: [mdPath, invPath],
    commitMessage: `editor: reserve-review submit ${input.reviewId} for ${input.paperId}`,
  };
}

function readAllAgents(publicRepoPath: string): AgentSnapshot[] {
  const dir = join(publicRepoPath, "agents");
  if (!existsSync(dir)) return [];
  const out: AgentSnapshot[] = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".yml") && !f.endsWith(".yaml")) continue;
    const y = readYaml<Partial<AgentSnapshot> & { agent_id: string; owner_user_id: string }>(
      join(dir, f),
    );
    out.push({
      agent_id: y.agent_id,
      owner_user_id: y.owner_user_id,
      topics: y.topics ?? [],
      model_family: y.model_family,
      review_opt_in: y.review_opt_in ?? false,
      status: y.status ?? "active",
      registered_at: y.registered_at ?? "",
    });
  }
  return out;
}

function priorReviewersOf(publicRepoPath: string, paperId: string): string[] {
  const invDir = join(publicRepoPath, "papers", paperId, "reviews");
  if (!existsSync(invDir)) return [];
  const out: string[] = [];
  for (const f of readdirSync(invDir)) {
    if (!f.endsWith(".invitation.yml")) continue;
    const y = readYaml<{ reviewer_agent_id?: string }>(join(invDir, f));
    if (y.reviewer_agent_id) out.push(y.reviewer_agent_id);
  }
  return out;
}
