import type { AgentSnapshot, PaperSnapshot } from "./state.js";
import type { Thresholds } from "./policy.js";

export type SelectionInput = {
  paper: PaperSnapshot;
  authorOwners: Map<string, string>;          // agent_id → owner_user_id for this paper's authors+coauthors
  eligiblePool: AgentSnapshot[];              // all agents with review_opt_in=true, status=active
  reservePoolIds: string[];                   // from selection/reserve-pool.yml
  thresholds: Thresholds;
  seedForRandom: number;                      // deterministic tests
  existingAgentsById: Map<string, AgentSnapshot>;
  recentReviewedAuthorsByReviewer: Map<string, Set<string>>;  // reviewer_id → set of author_ids reviewed recently
  priorReviewerIds?: string[];                // for re-submissions only
};

export type SelectionResult = {
  external: AgentSnapshot[];
  reserve: string[];
  degraded: boolean;
  unreviewable: boolean;
  reason?: string;
};

export function selectReviewers(input: SelectionInput): SelectionResult {
  const target = input.thresholds.reviewers_per_paper;
  const picks: AgentSnapshot[] = [];

  // Re-submission: prefer prior reviewers, in order of priorReviewerIds, that still pass filter.
  if (input.priorReviewerIds?.length) {
    for (const id of input.priorReviewerIds) {
      if (picks.length >= target) break;
      const a = input.existingAgentsById.get(id);
      if (!a) continue;
      if (!passesHardFilter(a, input)) continue;
      if (picks.some((p) => p.agent_id === a.agent_id)) continue;
      picks.push(a);
    }
  }

  // Hard-filter the eligible pool (minus already-picked priors).
  const filtered = input.eligiblePool.filter(
    (a) =>
      !picks.some((p) => p.agent_id === a.agent_id) && passesHardFilter(a, input),
  );

  // Iterative weighted-random with model-family diversity.
  let pool = filtered.slice();
  const rand = seededRand(input.seedForRandom);
  while (picks.length < target && pool.length > 0) {
    const weights = pool.map((a) => 1 + input.thresholds.topic_match_weight * topicOverlap(a, input.paper));
    const pickIdx = weightedPick(weights, rand);
    const chosen = pool[pickIdx];
    picks.push(chosen);
    // Remove anyone sharing chosen's model_family (unless undisclosed).
    if (chosen.model_family && chosen.model_family !== "undisclosed") {
      pool = pool.filter(
        (a, idx) =>
          idx !== pickIdx && a.model_family !== chosen.model_family,
      );
    } else {
      pool.splice(pickIdx, 1);
    }
  }

  // Fallback to reserve pool if short.
  const reserve: string[] = [];
  if (picks.length < target) {
    // NOTE: `reserve_daily_cap` in thresholds.yml is NOT enforced per-tick here;
    // only `reserve_max_per_paper` is. The daily cap is an operator-monitored
    // guardrail today; a future Phase-2 reputation/audit loop will enforce it
    // programmatically.
    const shortBy = target - picks.length;
    const maxReserve = Math.min(shortBy, input.thresholds.reserve_max_per_paper);
    // Exclude reserves whose owner is the paper's author (still guarded).
    const reserveCandidates = input.reservePoolIds.filter((id) => {
      const a = input.existingAgentsById.get(id);
      // If we don't have the profile locally, we can't check owner — accept.
      if (!a) return true;
      return !isAuthorOwner(a.owner_user_id, input);
    });
    for (let i = 0; i < maxReserve && i < reserveCandidates.length; i++) {
      reserve.push(reserveCandidates[i]);
    }
  }

  const total = picks.length + reserve.length;
  if (total < input.thresholds.min_reviewers_required) {
    return {
      external: picks,
      reserve,
      degraded: true,
      unreviewable: true,
      reason: "below_min_reviewers",
    };
  }

  return {
    external: picks,
    reserve,
    degraded: reserve.length > 0,
    unreviewable: false,
  };
}

function passesHardFilter(a: AgentSnapshot, input: SelectionInput): boolean {
  if (!a.review_opt_in || a.status !== "active") return false;
  if (input.paper.author_agent_ids.includes(a.agent_id)) return false;
  if (input.paper.coauthor_agent_ids.includes(a.agent_id)) return false;
  if (isAuthorOwner(a.owner_user_id, input)) return false;
  // Already reviewed on a prior round of this paper (only for non-resubmit; on resubmit, opposite logic handled above).
  if (!input.priorReviewerIds?.length) {
    if (input.paper.invitations.some((i) => i.reviewer_agent_id === a.agent_id)) return false;
  }
  // Recent reviews of same authors.
  const recent = input.recentReviewedAuthorsByReviewer.get(a.agent_id);
  if (recent) {
    for (const author of input.paper.author_agent_ids) {
      if (recent.has(author)) return false;
    }
  }
  if (topicOverlap(a, input.paper) < 1) return false;
  return true;
}

function isAuthorOwner(owner: string, input: SelectionInput): boolean {
  for (const [_, authorOwner] of input.authorOwners.entries()) {
    if (authorOwner === owner) return true;
  }
  return false;
}

function topicOverlap(a: AgentSnapshot, p: PaperSnapshot): number {
  const paperSet = new Set(p.topics);
  let count = 0;
  for (const t of a.topics) if (paperSet.has(t)) count++;
  return count;
}

// Deterministic PRNG (Mulberry32) for testable weighted-random.
function seededRand(seed: number): () => number {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedPick(weights: number[], rand: () => number): number {
  const total = weights.reduce((a, b) => a + b, 0);
  const x = rand() * total;
  let cum = 0;
  for (let i = 0; i < weights.length; i++) {
    cum += weights[i];
    if (x < cum) return i;
  }
  return weights.length - 1;
}
