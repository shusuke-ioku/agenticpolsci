import { loadPolicy } from "./lib/policy.js";
import { buildWorkQueue } from "./lib/state.js";
import { runTimeoutCheck } from "./phases/timeout_check.js";
import { commitDeskReview, type DeskReviewReasonTag } from "./phases/desk_review.js";
import { selectAndWriteInvitations, commitReserveReview } from "./phases/dispatch.js";
import { evaluateTier, commitDecision } from "./phases/decide.js";

export type SubagentStub = {
  deskReview: (paperId: string, paperMd: string, redactedMd: string, prompt: string) => Promise<{
    outcome: "accept_for_review" | "desk_reject";
    reason_tag: DeskReviewReasonTag | null;
    prose: string;
    prompt: string;
    response: string;
  }>;
  decide: (paperId: string, reviewsText: string, prompt: string) => Promise<{
    outcome: "accept" | "accept_with_revisions" | "major_revisions" | "reject";
    cited_reviews: Array<{ review_id: string; accepted_concerns: string[]; dismissed_concerns: string[] }>;
    prose: string;
  }>;
  reserveReview: (paperId: string, reviewId: string, rubric: string, redactedMd: string) => Promise<{
    recommendation: "accept" | "accept_with_revisions" | "major_revisions" | "reject";
    scores: { novelty: number; methodology: number; writing: number; significance: number; reproducibility: number };
    weakest_claim: string;
    falsifying_evidence: string;
    review_body: string;
  }>;
};

export type RunTickInput = {
  publicRepoPath: string;
  policyRepoPath: string;
  subagent: SubagentStub;
  seedForRandom: number;
  now?: Date;
};

export type TickResult = {
  phases: {
    timeout_check: { timedOut: string[] };
    desk_review: { accepted: string[]; rejected: string[] };
    dispatch: { papersDispatched: string[]; reserveReviewsCommitted: string[] };
    decide: { decided: string[] };
  };
};

export async function runTick(input: RunTickInput): Promise<TickResult> {
  const now = input.now ?? new Date();
  const policy = loadPolicy(input.policyRepoPath);
  const out: TickResult = {
    phases: {
      timeout_check: { timedOut: [] },
      desk_review: { accepted: [], rejected: [] },
      dispatch: { papersDispatched: [], reserveReviewsCommitted: [] },
      decide: { decided: [] },
    },
  };

  // Phase 1: timeout_check.
  const toResult = await runTimeoutCheck({ publicRepoPath: input.publicRepoPath, now });
  out.phases.timeout_check.timedOut = toResult.timedOut.map((t) => `${t.paper_id}:${t.review_id}`);

  // Phase 2: desk_review.
  let q = buildWorkQueue(input.publicRepoPath, now);
  for (const p of q.needs_desk_review) {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const paperMd = readFileSync(join(input.publicRepoPath, "papers", p.paper_id, "paper.md"), "utf-8");
    const redactedMd = readFileSync(
      join(input.publicRepoPath, "papers", p.paper_id, "paper.redacted.md"),
      "utf-8",
    );
    const sub = await input.subagent.deskReview(p.paper_id, paperMd, redactedMd, policy.prompts.deskReview);
    await commitDeskReview({
      publicRepoPath: input.publicRepoPath,
      paperId: p.paper_id,
      outcome: sub.outcome,
      reasonTag: sub.reason_tag,
      prose: sub.prose,
      subagentPrompt: sub.prompt,
      subagentResponse: sub.response,
      editorAgentId: policy.identity.editor_agent_id,
      now,
    });
    if (sub.outcome === "accept_for_review") out.phases.desk_review.accepted.push(p.paper_id);
    else out.phases.desk_review.rejected.push(p.paper_id);
  }

  // Phase 3: dispatch.
  q = buildWorkQueue(input.publicRepoPath, now);
  for (const p of q.needs_dispatch) {
    const res = await selectAndWriteInvitations({
      publicRepoPath: input.publicRepoPath,
      policyRepoPath: input.policyRepoPath,
      paperId: p.paper_id,
      seedForRandom: input.seedForRandom,
      now,
    });
    if (res.unreviewable) {
      await commitDeskReview({
        publicRepoPath: input.publicRepoPath,
        paperId: p.paper_id,
        outcome: "desk_reject",
        reasonTag: "no_eligible_reviewers",
        prose: "No eligible reviewers at time of dispatch and reserve pool exhausted.",
        subagentPrompt: "(no subagent — programmatic reject)",
        subagentResponse: "(no subagent — programmatic reject)",
        editorAgentId: policy.identity.editor_agent_id,
        now,
      });
      continue;
    }
    out.phases.dispatch.papersDispatched.push(p.paper_id);

    // Immediately produce reviews for reserve invitations.
    for (const inv of res.invitationsWritten.filter((i) => i.is_reserve)) {
      const rubric =
        p.type === "replication" ? policy.rubrics.replication : policy.rubrics.default;
      const { readFileSync } = await import("node:fs");
      const { join } = await import("node:path");
      const redactedMd = readFileSync(
        join(input.publicRepoPath, "papers", p.paper_id, "paper.redacted.md"),
        "utf-8",
      );
      const sub = await input.subagent.reserveReview(p.paper_id, inv.review_id, rubric, redactedMd);
      await commitReserveReview({
        publicRepoPath: input.publicRepoPath,
        paperId: p.paper_id,
        reviewId: inv.review_id,
        reviewerAgentId: inv.reviewer_agent_id,
        recommendation: sub.recommendation,
        scores: sub.scores,
        weakestClaim: sub.weakest_claim,
        falsifyingEvidence: sub.falsifying_evidence,
        reviewBody: sub.review_body,
        now,
      });
      out.phases.dispatch.reserveReviewsCommitted.push(`${p.paper_id}:${inv.review_id}`);
    }
  }

  // Phase 4: decide.
  q = buildWorkQueue(input.publicRepoPath, now);
  for (const p of q.needs_decide) {
    const t = await evaluateTier({
      publicRepoPath: input.publicRepoPath,
      policyRepoPath: input.policyRepoPath,
      paperId: p.paper_id,
    });
    if (t.tier === "unanimous_reject" || t.tier === "unanimous_accept" || t.tier === "replication_gate_fail") {
      const prose =
        t.tier === "replication_gate_fail"
          ? "Replication paper lacks a successful reproducibility artifact."
          : t.tier === "unanimous_reject"
            ? `Two or more reviewers recommended reject; I accept their reasoning.`
            : "All reviewers recommended accept without revisions.";
      await commitDecision({
        publicRepoPath: input.publicRepoPath,
        paperId: p.paper_id,
        outcome: t.autoOutcome!,
        citedReviews: p.reviews.map((r) => ({
          review_id: r.review_id,
          accepted_concerns: [],
          dismissed_concerns: [],
        })),
        prose,
        reviseWindowDays: policy.thresholds.revise_window_days,
        editorAgentId: policy.identity.editor_agent_id,
        now,
      });
      out.phases.decide.decided.push(p.paper_id);
      continue;
    }
    // contested
    const reviewsText = p.reviews.map((r) => `## ${r.review_id}\nrecommendation: ${r.recommendation}`).join("\n\n");
    const sub = await input.subagent.decide(p.paper_id, reviewsText, policy.prompts.decide);
    await commitDecision({
      publicRepoPath: input.publicRepoPath,
      paperId: p.paper_id,
      outcome: sub.outcome,
      citedReviews: sub.cited_reviews,
      prose: sub.prose,
      reviseWindowDays: policy.thresholds.revise_window_days,
      editorAgentId: policy.identity.editor_agent_id,
      now,
    });
    out.phases.decide.decided.push(p.paper_id);
  }

  return out;
}
