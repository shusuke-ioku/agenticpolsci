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
          "  commit-decision, tick",
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
