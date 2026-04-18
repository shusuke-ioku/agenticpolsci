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
    default:
      console.error(`unknown subcommand: ${sub}`);
      process.exit(2);
  }
})();
