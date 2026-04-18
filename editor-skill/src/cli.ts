#!/usr/bin/env tsx
import { buildWorkQueue } from "./lib/state.js";

const sub = process.argv[2] ?? "";
const args = parseArgs(process.argv.slice(3));

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      out[key] = v;
    }
  }
  return out;
}

await (async () => {
  switch (sub) {
    case "version":
      console.log(JSON.stringify({ name: "agentic-polsci-editor-skill", version: "0.0.0" }));
      return;
    case "help":
    case "":
      console.log("usage: editor-skill <subcommand>");
      console.log(
        "subcommands: version, help, list-work, timeout-check,\n" +
          "  commit-desk-review, select-reviewers, commit-reserve-review,\n" +
          "  commit-decision, evaluate-tier, tick,\n" +
          "  prepare-synthetic-fixture, simulate-review, synthetic-report",
      );
      return;
    case "list-work": {
      const publicRepo = args["public-repo"];
      if (!publicRepo) {
        console.error("list-work requires --public-repo <path>");
        process.exit(2);
      }
      const q = buildWorkQueue(publicRepo);
      console.log(
        JSON.stringify(
          {
            eligible_agents: q.eligible_agent_pool.length,
            papers: q.all_papers.length,
            needs_desk_review: q.needs_desk_review.map((p) => p.paper_id),
            needs_dispatch: q.needs_dispatch.map((p) => p.paper_id),
            needs_decide: q.needs_decide.map((p) => p.paper_id),
            needs_timeout_check: q.needs_timeout_check.map((t) => ({
              paper_id: t.paper_id,
              review_id: t.invitation.review_id,
            })),
          },
          null,
          2,
        ),
      );
      return;
    }
    case "timeout-check": {
      const publicRepo = args["public-repo"];
      if (!publicRepo) {
        console.error("timeout-check requires --public-repo <path>");
        process.exit(2);
      }
      const { runTimeoutCheck } = await import("./phases/timeout_check.js");
      const result = await runTimeoutCheck({ publicRepoPath: publicRepo });
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case "commit-desk-review": {
      const publicRepo = args["public-repo"];
      if (!publicRepo) {
        console.error("commit-desk-review requires --public-repo <path>");
        process.exit(2);
      }
      const body = await readStdinJson();
      const { commitDeskReview } = await import("./phases/desk_review.js");
      const result = await commitDeskReview({
        publicRepoPath: publicRepo,
        paperId: body.paper_id,
        outcome: body.outcome,
        reasonTag: body.reason_tag ?? null,
        prose: body.prose,
        subagentPrompt: body.subagent_prompt,
        subagentResponse: body.subagent_response,
        editorAgentId: body.editor_agent_id,
      });
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case "select-reviewers": {
      const publicRepo = args["public-repo"];
      const policyRepo = args["policy-repo"];
      const paperId = args["paper-id"];
      const seed = parseInt(args["seed"] ?? "0", 10);
      if (!publicRepo || !policyRepo || !paperId) {
        console.error(
          "select-reviewers requires --public-repo, --policy-repo, --paper-id, --seed",
        );
        process.exit(2);
      }
      const { selectAndWriteInvitations } = await import("./phases/dispatch.js");
      const result = await selectAndWriteInvitations({
        publicRepoPath: publicRepo,
        policyRepoPath: policyRepo,
        paperId,
        seedForRandom: seed,
      });
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case "commit-reserve-review": {
      const publicRepo = args["public-repo"];
      if (!publicRepo) {
        console.error("commit-reserve-review requires --public-repo <path>");
        process.exit(2);
      }
      const body = await readStdinJson();
      const { commitReserveReview } = await import("./phases/dispatch.js");
      const result = await commitReserveReview({
        publicRepoPath: publicRepo,
        paperId: body.paper_id,
        reviewId: body.review_id,
        reviewerAgentId: body.reviewer_agent_id,
        recommendation: body.recommendation,
        scores: body.scores,
        weakestClaim: body.weakest_claim,
        falsifyingEvidence: body.falsifying_evidence,
        reviewBody: body.review_body,
      });
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case "evaluate-tier": {
      const publicRepo = args["public-repo"];
      const policyRepo = args["policy-repo"];
      const paperId = args["paper-id"];
      if (!publicRepo || !policyRepo || !paperId) {
        console.error("evaluate-tier requires --public-repo, --policy-repo, --paper-id");
        process.exit(2);
      }
      const { evaluateTier } = await import("./phases/decide.js");
      const result = await evaluateTier({
        publicRepoPath: publicRepo,
        policyRepoPath: policyRepo,
        paperId,
      });
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case "commit-decision": {
      const publicRepo = args["public-repo"];
      const policyRepo = args["policy-repo"];
      if (!publicRepo || !policyRepo) {
        console.error("commit-decision requires --public-repo and --policy-repo");
        process.exit(2);
      }
      const body = await readStdinJson();
      const { loadPolicy } = await import("./lib/policy.js");
      const policy = loadPolicy(policyRepo);
      const { commitDecision } = await import("./phases/decide.js");
      const result = await commitDecision({
        publicRepoPath: publicRepo,
        paperId: body.paper_id,
        outcome: body.outcome,
        citedReviews: body.cited_reviews ?? [],
        prose: body.prose,
        reviseWindowDays: policy.thresholds.revise_window_days,
        editorAgentId: policy.identity.editor_agent_id,
      });
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case "tick": {
      const publicRepo = args["public-repo"];
      const policyRepo = args["policy-repo"];
      const dryRun = args["dry-run"] === "true";
      if (!publicRepo || !policyRepo) {
        console.error("tick requires --public-repo, --policy-repo");
        process.exit(2);
      }
      if (!dryRun) {
        console.error("tick currently supports --dry-run only; production flow runs via slash command");
        process.exit(2);
      }
      // Dry-run: use no-op subagent stubs that fail loudly if invoked.
      const { runTick } = await import("./tick.js");
      const stub = {
        deskReview: async () => {
          throw new Error("dry-run: desk_review would call subagent; aborting");
        },
        decide: async () => {
          throw new Error("dry-run: decide would call subagent; aborting");
        },
        reserveReview: async () => {
          throw new Error("dry-run: reserve would call subagent; aborting");
        },
      };
      try {
        const r = await runTick({
          publicRepoPath: publicRepo,
          policyRepoPath: policyRepo,
          subagent: stub,
          seedForRandom: parseInt(args["seed"] ?? "0", 10),
        });
        console.log(JSON.stringify(r, null, 2));
      } catch (e) {
        console.error("dry-run hit subagent boundary:", (e as Error).message);
      }
      return;
    }
    case "simulate-review": {
      const publicRepo = args["public-repo"];
      const paperId = args["paper-id"];
      const reviewId = args["review-id"];
      const reviewerAgentId = args["reviewer-agent-id"];
      const recommendation = args["recommendation"] as
        | "accept"
        | "accept_with_revisions"
        | "major_revisions"
        | "reject"
        | undefined;
      if (!publicRepo || !paperId || !reviewId || !reviewerAgentId || !recommendation) {
        console.error(
          "simulate-review requires --public-repo, --paper-id, --review-id, --reviewer-agent-id, --recommendation",
        );
        process.exit(2);
      }
      const { injectReviewerReview } = await import("../test/synthetic/helpers.js");
      injectReviewerReview(publicRepo, paperId, reviewId, reviewerAgentId, recommendation);
      console.log(JSON.stringify({ simulated: { paper_id: paperId, review_id: reviewId, reviewer_agent_id: reviewerAgentId, recommendation } }));
      return;
    }
    case "synthetic-report": {
      const publicRepo = args["public-repo"];
      const expected = args["expected-outcomes"];
      if (!publicRepo || !expected) {
        console.error("synthetic-report requires --public-repo and --expected-outcomes");
        process.exit(2);
      }
      const { runSyntheticReport, formatReport } = await import("./synthetic/report.js");
      const result = runSyntheticReport(publicRepo, expected);
      console.log(formatReport(result));
      process.exit(result.passed === result.total ? 0 : 1);
    }
    case "prepare-synthetic-fixture": {
      const target = args["target"];
      if (!target) {
        console.error("prepare-synthetic-fixture requires --target <path>");
        process.exit(2);
      }
      const { prepareSyntheticFixture } = await import("./synthetic/fixture-copy.js");
      const prepared = prepareSyntheticFixture(target);
      console.log(JSON.stringify(prepared, null, 2));
      return;
    }
    default:
      console.error(`unknown subcommand: ${sub}`);
      process.exit(2);
  }
})();

async function readStdinJson(): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString("utf-8");
  if (!raw.trim()) throw new Error("expected JSON on stdin");
  return JSON.parse(raw);
}
